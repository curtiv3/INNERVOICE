use std::sync::{Arc, Mutex};

use anyhow::{anyhow, Context, Result};
use hound::{SampleFormat, WavReader};
use lazy_static::lazy_static;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext};

lazy_static! {
    static ref WHISPER_CONTEXT: Mutex<Option<Arc<WhisperContext>>> = Mutex::new(None);
}

fn read_wav_pcm16_mono(path: &str) -> Result<Vec<f32>> {
    let mut reader = WavReader::open(path).context("Audio-Datei konnte nicht geöffnet werden")?;
    let spec = reader.spec();
    if spec.channels != 1 {
        return Err(anyhow!(
            "Audio hat {} Kanäle – erwartet wird Mono (1 Kanal)",
            spec.channels
        ));
    }
    if spec.sample_rate != 16_000 {
        return Err(anyhow!(
            "Audio hat {} Hz – erwartet werden 16 kHz",
            spec.sample_rate
        ));
    }
    if spec.bits_per_sample != 16 || spec.sample_format != SampleFormat::Int {
        return Err(anyhow!(
            "Audio ist nicht PCM16. Bits: {}, Format: {:?}",
            spec.bits_per_sample,
            spec.sample_format
        ));
    }
    let samples: Result<Vec<i16>> = reader
        .samples::<i16>()
        .collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|err| anyhow!("Audiodaten konnten nicht gelesen werden: {}", err));
    let buffer = samples?;
    let audio: Vec<f32> = buffer
        .iter()
        .map(|sample| *sample as f32 / i16::MAX as f32)
        .collect();
    Ok(audio)
}

fn resolve_context() -> Result<Arc<WhisperContext>> {
    let guard = WHISPER_CONTEXT
        .lock()
        .map_err(|_| anyhow!("Whisper-Kontext gesperrt"))?;
    guard
        .clone()
        .ok_or_else(|| anyhow!("Whisper wurde noch nicht initialisiert"))
}

fn store_context(context: WhisperContext) -> Result<()> {
    let mut guard = WHISPER_CONTEXT
        .lock()
        .map_err(|_| anyhow!("Whisper-Kontext gesperrt"))?;
    *guard = Some(Arc::new(context));
    Ok(())
}

fn resolve_language(lang: Option<String>) -> String {
    lang.and_then(|value| {
        let trimmed = value.trim().to_lowercase();
        if trimmed.len() >= 2 {
            Some(trimmed[..2].to_string())
        } else {
            None
        }
    })
    .filter(|code| !code.is_empty())
    .unwrap_or_else(|| "de".to_string())
}

#[tauri::command]
pub fn whisper_init(model_path: String) -> Result<String, String> {
    let path = model_path.trim();
    if path.is_empty() {
        return Err("Kein Modellpfad übergeben".to_string());
    }
    let context = WhisperContext::new(path)
        .map_err(|err| format!("Whisper-Modell konnte nicht geladen werden: {}", err))?;
    store_context(context)
        .map_err(|err| format!("Whisper-Kontext konnte nicht gespeichert werden: {}", err))?;
    Ok("Whisper initialisiert.".to_string())
}

#[tauri::command]
pub fn whisper_transcribe_wav16_mono(path: String, lang: Option<String>) -> Result<String, String> {
    let context = resolve_context().map_err(|err| err.to_string())?;
    let audio = read_wav_pcm16_mono(path.trim())
        .map_err(|err| format!("Audio konnte nicht vorbereitet werden: {}", err))?;

    let mut state = context
        .create_state()
        .map_err(|err| format!("Whisper-State konnte nicht erstellt werden: {}", err))?;

    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    params.set_translate(false);
    let language = resolve_language(lang);
    params.set_language(Some(&language));
    params.set_n_threads(num_cpus::get() as i32);

    state
        .full(params, &audio)
        .map_err(|err| format!("Transkription fehlgeschlagen: {}", err))?;

    let segment_count = state
        .full_n_segments()
        .map_err(|err| format!("Segmentanzahl konnte nicht gelesen werden: {}", err))?;
    let mut transcript = String::new();
    for index in 0..segment_count {
        let segment = state
            .full_get_segment_text(index)
            .map_err(|err| format!("Segment konnte nicht gelesen werden: {}", err))?;
        if !transcript.is_empty() {
            transcript.push(' ');
        }
        transcript.push_str(segment.trim());
    }

    Ok(transcript)
}
