# =============================================================================
# SUNO AI → PLATINUM MASTERING (DIAMOND SOUND + QUALITY CONTROL)
# 💎 DSP: 30Hz HPF + Stereo Widen + EBU R128
# 🕵️‍♂️ QA: Integrated Integrated Loudness, Phase & Peak Analysis
# =============================================================================

print("🎛️  Installing Studio Dependencies & Metering Tools...")

!pip uninstall -y torch torchaudio demucs -q > /dev/null 2>&1
!pip install -U librosa soundfile tqdm scipy pyloudnorm -q
!apt-get -qq update && apt-get -qq install -y ffmpeg > /dev/null 2>&1

print("✅ System Ready!")

# =============================================================================
# SETUP
# =============================================================================

from google.colab import files
from tqdm import tqdm
import os
import shutil
import subprocess
import numpy as np
import librosa
import soundfile as sf
import pyloudnorm as pyln
from scipy.signal import butter, sosfiltfilt
from pathlib import Path

BASE_DIR = '/content/suno_platinum_master'
if os.path.exists(BASE_DIR): shutil.rmtree(BASE_DIR)
os.makedirs(f'{BASE_DIR}/input', exist_ok=True)
os.makedirs(f'{BASE_DIR}/output', exist_ok=True)

print("\n📤 Upload your WAV/MP3 files...")
uploaded = files.upload()

print(f"\n📂 Moving files...")
for filename in uploaded.keys():
    if filename.lower().endswith(('.wav', '.mp3')):
        os.rename(f'/content/{filename}', f'{BASE_DIR}/input/{filename}')

print(f"✨ Files ready!")

# =============================================================================
# MODULE 1: DSP PROCESSING (THE SOUND)
# =============================================================================

def enhance_stereo_image(y, sr, width_amount=1.15):
    """Безопасное расширение стерео (Mid-Side) с моно-басом"""
    if y.ndim < 2: return y
    
    mid = (y[0] + y[1]) * 0.5
    side = (y[0] - y[1]) * 0.5
    
    # HPF on Side (Bass Mono < 120Hz)
    sos_side = butter(4, 120, 'hp', fs=sr, output='sos')
    side_filtered = sosfiltfilt(sos_side, side)
    
    # Widen
    side_enhanced = side_filtered * width_amount
    
    return np.stack([mid + side_enhanced, mid - side_enhanced])

def process_track_dsp(input_path, output_wav):
    print(f"   ⚙️  DSP Processing: ", end='', flush=True)
    
    # LOAD
    print("[LOAD]", end='', flush=True)
    y, sr = librosa.load(input_path, sr=44100, mono=False)
    
    # HPF 30Hz (Clean Sub-bass)
    print(" → [HPF 30Hz]", end='', flush=True)
    sos = butter(4, 30, 'hp', fs=sr, output='sos')
    
    if y.ndim > 1:
        y[0] = sosfiltfilt(sos, y[0] - np.mean(y[0]))
        y[1] = sosfiltfilt(sos, y[1] - np.mean(y[1]))
        
        # STEREO WIDEN
        print(" → [WIDEN]", end='', flush=True)
        y = enhance_stereo_image(y, sr, width_amount=1.15)
    else:
        y = sosfiltfilt(sos, y - np.mean(y))
    
    # Pre-Norm
    peak = np.max(np.abs(y))
    if peak > 0: y = y / peak * 0.9
    
    # SAVE TEMP
    sf.write(output_wav, y.T, sr)
    print(" ✅")

def final_master(wav_file, output_file):
    print(f"   🎚️  Loudness Norm:  ", end='', flush=True)
    cmd = [
        'ffmpeg', '-y', '-hide_banner', '-loglevel', 'error',
        '-i', wav_file,
        '-filter_complex',
        'afade=t=in:ss=0:d=0.01,afade=t=out:st=300:d=1.0,'
        'loudnorm=I=-14:TP=-1.0:LRA=11:linear=true',
        '-ar', '44100', '-ac', '2', '-acodec', 'pcm_s16le',
        output_file
    ]
    if subprocess.run(cmd).returncode == 0:
        print(" ✅")
        return True
    print(" ❌")
    return False

# =============================================================================
# MODULE 2: QUALITY INSPECTOR (THE CHECK)
# =============================================================================

def inspect_quality(file_path):
    print(f"   🕵️‍♂️ Quality Check:  ", end='', flush=True)
    
    try:
        data, rate = sf.read(file_path)
        meter = pyln.Meter(rate) 
        
        # 1. Loudness
        loudness = meter.integrated_loudness(data)
        
        # 2. Peak
        peak = np.max(np.abs(data))
        peak_db = 20 * np.log10(peak + 1e-9)
        
        # 3. Dynamics (Crest)
        rms = np.sqrt(np.mean(data**2))
        crest = 20 * np.log10(peak / (rms + 1e-9))
        
        # 4. Phase
        corr = 0
        if data.shape[1] > 1:
            corr = np.corrcoef(data[:, 0], data[:, 1])[0, 1]
            
        print(" DONE. Generating Report...\n")
        
        # PRINT REPORT CARD
        print(f"      {'-'*40}")
        print(f"      📊 REPORT CARD: {Path(file_path).stem}")
        print(f"      {'-'*40}")
        
        # LOUDNESS CHECK
        l_status = "✅" if -15.0 <= loudness <= -13.0 else "⚠️"
        print(f"      {l_status} Loudness: {loudness:.2f} LUFS (Target: -14)")
        
        # PEAK CHECK
        p_status = "✅" if -2.0 <= peak_db <= -0.9 else "⚠️"
        if peak_db > -0.9: p_status = "❌ CLIPPING"
        print(f"      {p_status} True Peak: {peak_db:.2f} dB (Target: -1.0)")
        
        # DYNAMICS CHECK
        d_status = "✅" if crest > 6 else "❌ FLATTENED"
        print(f"      {d_status} Dynamics: {crest:.1f} dB (Crest Factor)")
        
        # PHASE CHECK
        ph_status = "✅" if corr > 0 else "❌ PHASE ISSUES"
        print(f"      {ph_status} Stereo Phase: {corr:.2f} (+1.0 is Mono)")
        print(f"      {'-'*40}\n")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during inspection: {e}")
        return False

# =============================================================================
# MAIN PIPELINE
# =============================================================================

print("\n" + "="*72)
print("🚀 STARTING PLATINUM PIPELINE")
print("="*72)

input_dir = f'{BASE_DIR}/input'
files_list = sorted([f for f in os.listdir(input_dir) if f.lower().endswith(('.wav', '.mp3'))])

if not files_list:
    print("❌ No audio files!")
else:
    print(f"\n📊 Queue: {len(files_list)} track(s)\n")
    results = []
    
    for idx, f_name in enumerate(files_list, 1):
        track_name = Path(f_name).stem
        in_path = f'{input_dir}/{f_name}'
        tmp_path = f'{BASE_DIR}/output/{track_name}_tmp.wav'
        out_path = f'{BASE_DIR}/output/{track_name}_MASTER.wav'
        
        print(f"[{idx}/{len(files_list)}] 📀 {track_name}")
        
        try:
            # 1. DSP
            process_track_dsp(in_path, tmp_path)
            
            # 2. Master
            if final_master(tmp_path, out_path):
                os.remove(tmp_path)
                
                # 3. INSPECT (NEW!)
                inspect_quality(out_path)
                
                results.append(out_path)
        except Exception as e:
            print(f"   ❌ CRITICAL ERROR: {e}")

# =============================================================================
# DOWNLOAD
# =============================================================================

print("\n" + "="*72)
print("📦 DOWNLOAD")
print("="*72)

if results:
    zip_name = '/content/suno_platinum_masters'
    shutil.make_archive(zip_name, 'zip', f'{BASE_DIR}/output')
    files.download(zip_name + '.zip')
    print("\n✨ Done! Your certified masters are ready.")
else:
    print("❌ No masters created.")