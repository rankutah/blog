---
date: 2025-07-28
is_published: Published
title: Shell Script for ImageMagick to Resize Images
tags:
  - script
  - web-design
---

_Utah office: [Pleasant Grove, UT](/locations/pleasant-grove-ut) — serving businesses across the U.S._

If you work in web publishing you often need to resize many images to be under a specific size, or of a different format, without loosing quality. This zsh script uses ImageMagick to:

1.  Convert multiple image to JPEG or a different image format such as AVIF or WebP
    
2.  Set the width of your images
    
3.  Resize images so that each on is under a specified size (default of 130 KB)
    
4.  Organize your original images into an Originals/ folder and resized images into a Resized/ folder
    
## Prerequisites

Install ImageMagick on a Mac or Linux computer

*   ImageMagick (brew install bash imagemagick)
    

Save the script below and make it executable by running

```
chmod +x resize-images.zsh
```

Now you can run the script and then supply the path to your image folder. Or simply drag your image folder into the terminal to capture the path.

```
./resize-images.sh [drag folder here]
or
./resize-images.sh /path/to/your/images
```

## How it works

This script repeatedly resizes and drops quality in 10% incremental steps until it is under your desired file size. All images output at your desired format, width, and file-size.

## The script

```
#!/usr/bin/env bash

# 1. Ask for folder if no argument given
if [ -z "$1" ]; then
    echo "Drag your image folder here and press Enter:"
    read folder_path
else
    folder_path="$1"
fi

# 2. Validate folder
if [ ! -d "$folder_path" ]; then
    echo "Error: Not a valid directory."
    exit 1
fi
cd "$folder_path" || exit

# 3. Prepare output dirs
mkdir -p Resized
mkdir -p Originals

# 4. Set max size (130 KB)
target_size=130000

# 5. Enable nullglob so globs that match nothing disappear
shopt -s nullglob

image_found=false

# 6. Loop through images
for input_image in *.jpg *.jpeg *.JPG *.JPEG \
                   *.png *.heic *.HEIC *.bmp *.tiff \
                   *.gif *.webp *.svg *.eps *.pdf \
                   *.ico *.jp2 *.psd *.xcf; do
    image_found=true

    # Output name
    base="${input_image%.*}"
    output="Resized/${base}.jpg"

    # Get size in bytes (Linux vs. macOS)
    if stat --version >/dev/null 2>&1; then
      size=$(stat -c %s "$input_image")
    else
      size=$(stat -f %z "$input_image")
    fi

    if [ "$size" -le "$target_size" ]; then
        echo "Copying small file: $input_image"
        cp "$input_image" "$output"
    else
        # Start resizing
        quality=100
        while :; do
            echo "Resizing $input_image at quality $quality..."
            magick "$input_image" -resize 1200x -quality "$quality" \
                   -sampling-factor 4:2:0 -strip "$output"
            [ ! -f "$output" ] && { echo "❌ Failed to create $output"; break; }

            if stat --version >/dev/null 2>&1; then
              new_size=$(stat -c %s "$output")
            else
              new_size=$(stat -f %z "$output")
            fi

            if [ "$new_size" -le "$target_size" ]; then
                echo "✅ $output is now $((new_size/1024)) KB"
                break
            fi

            echo "⚠️ Too big ($((new_size/1024)) KB). Lowering quality."
            rm "$output"
            quality=$((quality - 10))
            if [ "$quality" -le 30 ]; then
                echo "🔒 Quality floor reached. Saving at 30%."
                magick "$input_image" -resize 1200x -quality 30 \
                       -sampling-factor 4:2:0 -strip "$output"
                break
            fi
        done
    fi

    # Move original
    mv "$input_image" Originals/
done

# Final message
if ! $image_found; then
    echo "No images found in this directory."
else
    echo "All done! Check Resized/ and Originals/."
fi
   
```