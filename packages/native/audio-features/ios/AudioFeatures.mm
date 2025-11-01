#import "AudioFeatures.h"

#import <Accelerate/Accelerate.h>
#import <React/RCTConvert.h>

static inline double clamp01(double value) {
  if (value < 0.0) {
    return 0.0;
  }
  if (value > 1.0) {
    return 1.0;
  }
  return value;
}

struct FeatureResult {
  double duration;
  double rmsMean;
  double rmsStd;
  double zcrMean;
  double f0Mean;
  double f0Std;
  double speechRatio;
  bool   hasVoiced;
};

static bool parseWav(NSString *filePath, std::vector<float> &outSamples, double &outDuration, double &outSampleRate) {
  NSData *data = [NSData dataWithContentsOfFile:filePath options:NSDataReadingMappedIfSafe error:nil];
  if (!data || data.length < 44) {
    return false;
  }
  const unsigned char *bytes = (const unsigned char *)data.bytes;
  if (memcmp(bytes, "RIFF", 4) != 0 || memcmp(bytes + 8, "WAVE", 4) != 0) {
    return false;
  }
  uint16_t numChannels = *(uint16_t *)(bytes + 22);
  uint32_t sampleRate = *(uint32_t *)(bytes + 24);
  uint16_t bitsPerSample = *(uint16_t *)(bytes + 34);
  if (bitsPerSample != 16 || numChannels < 1) {
    return false;
  }
  uint32_t byteRate = *(uint32_t *)(bytes + 28);
  (void)byteRate;

  size_t offset = 12;
  uint32_t dataSize = 0;
  while (offset + 8 <= data.length) {
    uint32_t chunkId = *(uint32_t *)(bytes + offset);
    uint32_t chunkSize = *(uint32_t *)(bytes + offset + 4);
    if (chunkId == 'atad') {
      dataSize = chunkSize;
      offset += 8;
      break;
    }
    offset += 8 + chunkSize;
  }
  if (dataSize == 0 || offset + dataSize > data.length) {
    return false;
  }
  size_t totalSamples = dataSize / (bitsPerSample / 8);
  outSamples.resize(totalSamples);
  const int16_t *pcm = (const int16_t *)(bytes + offset);
  for (size_t i = 0; i < totalSamples; ++i) {
    outSamples[i] = (float)pcm[i] / 32768.0f;
  }
  if (numChannels > 1) {
    std::vector<float> mono(totalSamples / numChannels, 0.0f);
    for (size_t i = 0; i < mono.size(); ++i) {
      double sum = 0.0;
      for (uint16_t ch = 0; ch < numChannels; ++ch) {
        sum += outSamples[i * numChannels + ch];
      }
      mono[i] = (float)(sum / numChannels);
    }
    outSamples.swap(mono);
  }
  outSampleRate = (double)sampleRate;
  outDuration = (double)outSamples.size() / outSampleRate;
  return true;
}

static FeatureResult computeFeatures(const std::vector<float> &samples, double sampleRate) {
  const size_t frameSize = (size_t)(0.025 * sampleRate);
  const size_t hopSize = (size_t)(0.01 * sampleRate);
  if (frameSize == 0 || hopSize == 0 || samples.empty()) {
    return {0, 0, 0, 0, 0, 0, 0, false};
  }
  std::vector<double> rmsValues;
  std::vector<double> zcrValues;
  std::vector<double> f0Values;
  size_t voicedFrames = 0;

  for (size_t start = 0; start + frameSize <= samples.size(); start += hopSize) {
    double energy = 0.0;
    int zeroCrossings = 0;
    for (size_t i = 0; i < frameSize; ++i) {
      float sample = samples[start + i];
      energy += sample * sample;
      if (i > 0) {
        float prev = samples[start + i - 1];
        if ((sample >= 0 && prev < 0) || (sample < 0 && prev >= 0)) {
          zeroCrossings++;
        }
      }
    }
    double rms = sqrt(energy / (double)frameSize);
    double zcr = (double)zeroCrossings / (double)frameSize;

    rmsValues.push_back(rms);
    zcrValues.push_back(zcr);

    // Autocorrelation for pitch
    double maxCorr = 0.0;
    size_t bestLag = 0;
    const size_t minLag = (size_t)(sampleRate / 400.0);
    const size_t maxLag = (size_t)(sampleRate / 60.0);
    if (rms > 1e-4) {
      for (size_t lag = minLag; lag <= maxLag; ++lag) {
        double corr = 0.0;
        for (size_t i = 0; i < frameSize - lag; ++i) {
          corr += samples[start + i] * samples[start + i + lag];
        }
        corr /= (double)(frameSize - lag);
        if (corr > maxCorr) {
          maxCorr = corr;
          bestLag = lag;
        }
      }
    }
    bool isVoiced = (rms > 0.01) && (maxCorr > 0.3);
    if (isVoiced && bestLag > 0) {
      double f0 = sampleRate / (double)bestLag;
      f0Values.push_back(f0);
      voicedFrames++;
    }
  }

  auto meanStd = [](const std::vector<double> &values) {
    double mean = 0.0;
    double sq = 0.0;
    if (values.empty()) {
      return std::pair<double, double>{0.0, 0.0};
    }
    for (double v : values) {
      mean += v;
    }
    mean /= (double)values.size();
    for (double v : values) {
      sq += (v - mean) * (v - mean);
    }
    double variance = values.size() > 1 ? sq / (double)(values.size() - 1) : 0.0;
    return std::pair<double, double>{mean, sqrt(variance)};
  };

  auto [rmsMean, rmsStd] = meanStd(rmsValues);
  auto [zcrMean, _] = meanStd(zcrValues);
  auto [f0Mean, f0Std] = meanStd(f0Values);

  FeatureResult result;
  result.duration = (double)samples.size() / sampleRate;
  result.rmsMean = rmsMean;
  result.rmsStd = rmsStd;
  result.zcrMean = zcrMean;
  result.f0Mean = f0Mean;
  result.f0Std = f0Std;
  result.speechRatio = rmsValues.empty() ? 0.0 : (double)voicedFrames / (double)rmsValues.size();
  result.hasVoiced = !f0Values.empty();
  return result;
}

@implementation AudioFeaturesModule

RCT_EXPORT_MODULE();

RCT_REMAP_METHOD(extractAudioFeatures,
                 extractAudioFeatures:(NSString *)fileUri
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  if (fileUri.length == 0) {
    reject(@"invalid_uri", @"File URI is required", nil);
    return;
  }
  NSString *path = fileUri;
  if ([fileUri hasPrefix:@"file://"]) {
    path = [fileUri substringFromIndex:7];
  }
  std::vector<float> samples;
  double duration = 0.0;
  double sampleRate = 16000.0;
  if (!parseWav(path, samples, duration, sampleRate)) {
    reject(@"read_error", @"Unable to parse wav file", nil);
    return;
  }
  FeatureResult features = computeFeatures(samples, sampleRate);

  double stability = features.hasVoiced ? (1.0 / (1.0 + features.f0Std)) : 0.0;
  NSDictionary *response = @{ 
    @"duration": @(features.duration),
    @"rms_mean": @(features.rmsMean),
    @"rms_std": @(features.rmsStd),
    @"zcr_mean": @(features.zcrMean),
    @"f0_mean": features.hasVoiced ? @(features.f0Mean) : [NSNull null],
    @"f0_stability": @(clamp01(stability)),
    @"speech_ratio": @(clamp01(features.speechRatio))
  };
  resolve(response);
}

@end
