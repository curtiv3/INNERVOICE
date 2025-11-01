#include <jni.h>
#include <cmath>
#include <cstdint>
#include <fstream>
#include <string>
#include <vector>

namespace {
struct FeatureResult {
  double duration{0.0};
  double rmsMean{0.0};
  double rmsStd{0.0};
  double zcrMean{0.0};
  double f0Mean{0.0};
  double f0Std{0.0};
  double speechRatio{0.0};
  bool hasVoiced{false};
};

bool readWav(const std::string &path, std::vector<float> &samples, double &duration, double &sampleRateOut) {
  std::ifstream file(path, std::ios::binary);
  if (!file.is_open()) {
    return false;
  }
  char header[44];
  file.read(header, 44);
  if (file.gcount() < 44) {
    return false;
  }
  if (std::string(header, header + 4) != "RIFF" || std::string(header + 8, header + 12) != "WAVE") {
    return false;
  }
  uint16_t channels = *reinterpret_cast<uint16_t *>(header + 22);
  uint32_t sampleRate = *reinterpret_cast<uint32_t *>(header + 24);
  uint16_t bitsPerSample = *reinterpret_cast<uint16_t *>(header + 34);
  if (bitsPerSample != 16 || channels < 1) {
    return false;
  }

  uint32_t dataSize = 0;
  while (file && !dataSize) {
    char chunkHeader[8];
    file.read(chunkHeader, 8);
    if (file.gcount() < 8) {
      break;
    }
    uint32_t chunkId = *reinterpret_cast<uint32_t *>(chunkHeader);
    uint32_t chunkSize = *reinterpret_cast<uint32_t *>(chunkHeader + 4);
    if (chunkId == 0x64617461) { // 'data'
      dataSize = chunkSize;
      break;
    }
    file.seekg(chunkSize, std::ios::cur);
  }
  if (!dataSize) {
    return false;
  }
  std::vector<int16_t> buffer(dataSize / sizeof(int16_t));
  file.read(reinterpret_cast<char *>(buffer.data()), dataSize);
  size_t readBytes = file.gcount();
  if (readBytes < dataSize) {
    buffer.resize(readBytes / sizeof(int16_t));
  }
  samples.resize(buffer.size() / channels);
  for (size_t i = 0; i < samples.size(); ++i) {
    double sum = 0.0;
    for (uint16_t ch = 0; ch < channels; ++ch) {
      sum += buffer[i * channels + ch] / 32768.0;
    }
    samples[i] = static_cast<float>(sum / channels);
  }
  sampleRateOut = static_cast<double>(sampleRate);
  duration = static_cast<double>(samples.size()) / sampleRateOut;
  return true;
}

FeatureResult computeFeatures(const std::vector<float> &samples, double sampleRate) {
  const size_t frameSize = static_cast<size_t>(0.025 * sampleRate);
  const size_t hopSize = static_cast<size_t>(0.01 * sampleRate);
  if (!frameSize || !hopSize || samples.empty()) {
    return {};
  }
  std::vector<double> rmsValues;
  std::vector<double> zcrValues;
  std::vector<double> f0Values;
  size_t voicedFrames = 0;

  for (size_t start = 0; start + frameSize <= samples.size(); start += hopSize) {
    double energy = 0.0;
    int zeroCrossings = 0;
    for (size_t i = 0; i < frameSize; ++i) {
      double sample = samples[start + i];
      energy += sample * sample;
      if (i > 0) {
        double prev = samples[start + i - 1];
        if ((sample >= 0 && prev < 0) || (sample < 0 && prev >= 0)) {
          ++zeroCrossings;
        }
      }
    }
    double rms = std::sqrt(energy / static_cast<double>(frameSize));
    double zcr = static_cast<double>(zeroCrossings) / static_cast<double>(frameSize);
    rmsValues.push_back(rms);
    zcrValues.push_back(zcr);

    const size_t minLag = static_cast<size_t>(sampleRate / 400.0);
    const size_t maxLag = static_cast<size_t>(sampleRate / 60.0);
    double maxCorr = 0.0;
    size_t bestLag = 0;
    if (rms > 1e-4) {
      for (size_t lag = minLag; lag <= maxLag; ++lag) {
        double corr = 0.0;
        for (size_t i = 0; i < frameSize - lag; ++i) {
          corr += samples[start + i] * samples[start + i + lag];
        }
        corr /= static_cast<double>(frameSize - lag);
        if (corr > maxCorr) {
          maxCorr = corr;
          bestLag = lag;
        }
      }
    }
    bool voiced = rms > 0.01 && maxCorr > 0.3 && bestLag > 0;
    if (voiced) {
      double f0 = sampleRate / static_cast<double>(bestLag);
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
    mean /= static_cast<double>(values.size());
    for (double v : values) {
      sq += (v - mean) * (v - mean);
    }
    double variance = values.size() > 1 ? sq / static_cast<double>(values.size() - 1) : 0.0;
    return std::pair<double, double>{mean, std::sqrt(variance)};
  };

  auto [rmsMean, rmsStd] = meanStd(rmsValues);
  auto [zcrMean, _] = meanStd(zcrValues);
  auto [f0Mean, f0Std] = meanStd(f0Values);

  FeatureResult result;
  result.duration = static_cast<double>(samples.size()) / sampleRate;
  result.rmsMean = rmsMean;
  result.rmsStd = rmsStd;
  result.zcrMean = zcrMean;
  result.f0Mean = f0Mean;
  result.f0Std = f0Std;
  result.speechRatio = rmsValues.empty() ? 0.0 : static_cast<double>(voicedFrames) / static_cast<double>(rmsValues.size());
  result.hasVoiced = !f0Values.empty();
  return result;
}

double clamp01(double value) {
  if (value < 0.0) return 0.0;
  if (value > 1.0) return 1.0;
  return value;
}

} // namespace

extern "C" JNIEXPORT jdoubleArray JNICALL
Java_com_innervoice_audiofeatures_AudioFeaturesModule_nativeExtractFeatures(
  JNIEnv *env,
  jobject /* this */,
  jstring jPath) {
  const char *pathChars = env->GetStringUTFChars(jPath, nullptr);
  std::string path(pathChars ? pathChars : "");
  if (pathChars) {
    env->ReleaseStringUTFChars(jPath, pathChars);
  }
  std::vector<float> samples;
  double duration = 0.0;
  double sampleRate = 16000.0;
  if (!readWav(path, samples, duration, sampleRate)) {
    jdoubleArray arr = env->NewDoubleArray(7);
    std::vector<double> zeros(7, 0.0);
    env->SetDoubleArrayRegion(arr, 0, 7, zeros.data());
    return arr;
  }
  auto features = computeFeatures(samples, sampleRate);
  double stability = features.hasVoiced ? 1.0 / (1.0 + features.f0Std) : 0.0;
  jdouble values[7];
  values[0] = features.duration;
  values[1] = features.rmsMean;
  values[2] = features.rmsStd;
  values[3] = features.zcrMean;
  values[4] = features.hasVoiced ? features.f0Mean : 0.0;
  values[5] = clamp01(stability);
  values[6] = clamp01(features.speechRatio);
  jdoubleArray result = env->NewDoubleArray(7);
  env->SetDoubleArrayRegion(result, 0, 7, values);
  return result;
}
