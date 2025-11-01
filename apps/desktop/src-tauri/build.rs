use std::{fs, io, iter, path::Path};

fn main() {
    if let Err(error) = ensure_windows_icon() {
        panic!("failed to ensure Windows icon: {error}");
    }
    tauri_build::build()
}

fn ensure_windows_icon() -> io::Result<()> {
    let icon_path = Path::new("icons/icon.ico");

    if icon_path.exists() {
        return Ok(());
    }

    if let Some(parent) = icon_path.parent() {
        fs::create_dir_all(parent)?;
    }

    fs::write(icon_path, default_icon_bytes())
}

fn default_icon_bytes() -> Vec<u8> {
    const WIDTH: u32 = 16;
    const HEIGHT: u32 = 16;
    const BITMAP_HEADER_SIZE: usize = 40;
    const ICONDIR_SIZE: usize = 6;
    const DIRECTORY_ENTRY_SIZE: usize = 16;
    const PLANES: u16 = 1;
    const BITS_PER_PIXEL: u16 = 32;

    let mask_row_bytes = (((WIDTH as usize) + 31) / 32) * 4;
    let mask_size = mask_row_bytes * HEIGHT as usize;
    let pixel_bytes = (WIDTH * HEIGHT * 4) as usize;
    let image_size = BITMAP_HEADER_SIZE + pixel_bytes + mask_size;

    let mut data = Vec::with_capacity(ICONDIR_SIZE + DIRECTORY_ENTRY_SIZE + image_size);

    // ICONDIR header
    data.extend_from_slice(&0u16.to_le_bytes());
    data.extend_from_slice(&1u16.to_le_bytes());
    data.extend_from_slice(&1u16.to_le_bytes());

    // Single icon directory entry
    let mut entry = [0u8; DIRECTORY_ENTRY_SIZE];
    entry[0] = WIDTH as u8;
    entry[1] = HEIGHT as u8;
    entry[4..6].copy_from_slice(&PLANES.to_le_bytes());
    entry[6..8].copy_from_slice(&BITS_PER_PIXEL.to_le_bytes());
    entry[8..12].copy_from_slice(&(image_size as u32).to_le_bytes());
    entry[12..16].copy_from_slice(&((ICONDIR_SIZE + DIRECTORY_ENTRY_SIZE) as u32).to_le_bytes());
    data.extend_from_slice(&entry);

    // BITMAPINFOHEADER
    let mut bitmap_header = [0u8; BITMAP_HEADER_SIZE];
    bitmap_header[0..4].copy_from_slice(&(BITMAP_HEADER_SIZE as u32).to_le_bytes());
    bitmap_header[4..8].copy_from_slice(&(WIDTH as i32).to_le_bytes());
    bitmap_header[8..12].copy_from_slice(&((HEIGHT * 2) as i32).to_le_bytes());
    bitmap_header[12..14].copy_from_slice(&PLANES.to_le_bytes());
    bitmap_header[14..16].copy_from_slice(&BITS_PER_PIXEL.to_le_bytes());
    bitmap_header[20..24].copy_from_slice(&((pixel_bytes + mask_size) as u32).to_le_bytes());
    data.extend_from_slice(&bitmap_header);

    // Pixel data (fully transparent) + AND mask (all zeros)
    data.extend(iter::repeat(0u8).take(pixel_bytes + mask_size));

    data
}
