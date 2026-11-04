import os
import subprocess
from pathlib import Path

def batch_convert_and_normalize(input_dir, output_dir, target_lufs=-10):
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    
    # Tự động khởi tạo thư mục đầu ra nếu chưa tồn tại
    output_path.mkdir(parents=True, exist_ok=True)
    
    valid_extensions = {'.mp3', '.wav', '.mp4', '.m4a'}
    print(f"Bắt đầu quét thư mục: {input_path}")
    print(f"Mục tiêu độ lớn: {target_lufs} LUFS")
    print("-" * 40)
    
    for file_path in input_path.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in valid_extensions:
            output_file = output_path / file_path.with_suffix('.mp3').name
            print(f"Đang xử lý: {file_path.name}...")
            
            # Cấu hình FFmpeg để chuẩn hóa âm lượng và ép chuẩn MP3
            command = [
                'ffmpeg', '-i', str(file_path),
                '-vn', '-acodec', 'libmp3lame', '-q:a', '2',
                '-af', f'loudnorm=I={target_lufs}:TP=-1.5:LRA=11',
                '-y', str(output_file)
            ]
            
            try:
                subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                print(f"  -> Xong! Đã lưu: {output_file.name}")
            except FileNotFoundError:
                print("🚨 LỖI: Chưa cài đặt FFmpeg trên máy tính!")
                return
            except subprocess.CalledProcessError:
                print(f"🚨 LỖI: Không thể xử lý file {file_path.name}")

    print("-" * 40)
    print(f"🎉 Hoàn tất! File mới chuẩn hóa nằm ở: {output_path}")

if __name__ == '__main__':
    THU_MUC_DAU_VAO = "assets/audio_goc"
    THU_MUC_DAU_RA = "assets/audio" 
    
    batch_convert_and_normalize(THU_MUC_DAU_VAO, THU_MUC_DAU_RA)