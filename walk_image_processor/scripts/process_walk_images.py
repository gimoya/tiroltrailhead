#!/usr/bin/env python3
"""
Walk Image Processor for Scientific Reports
Automatically processes walk images with date-time in filenames and generates
ordered markdown with captions based on chronological order.
"""

import os
import re
import math
import argparse
import shutil
import sys
import subprocess
from typing import List, Tuple, Dict, Optional
from datetime import datetime

# Image compression imports
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("WARNING: PIL/Pillow not available - image compression disabled")

# Constants for filename parsing
TIMESTAMP_PATTERN = r'(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})'  # YYYYMMDDHHMM format

def load_template(template_path: str = None) -> str:
    """Load template from path or use default"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    system_dir = os.path.dirname(script_dir)
    
    # If custom template path provided
    if template_path and os.path.isfile(template_path):
        try:
            with open(template_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            print(f"ERROR loading custom template: {e}")
            print("Using default template instead.")
    
    # Use default template
    default_path = os.path.join(system_dir, "templates", "default.md")
    if os.path.exists(default_path):
        try:
            with open(default_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            print(f"ERROR loading default template: {e}")
    
    # Fallback to built-in template
    return get_builtin_template()

def get_builtin_template() -> str:
    """Fallback built-in template"""
    return """# {title}

**Datum:** {date} | **Ort:** {location}

---

{content}

---

*{total_images} Bilder • {total_distance} km*"""

def check_wkhtmltopdf_installation() -> bool:
    """Check if wkhtmltopdf is available"""
    try:
        result = subprocess.run(['wkhtmltopdf', '--version'], 
                              capture_output=True, text=True, timeout=10)
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.SubprocessError):
        return False

def extract_timestamp_info(filename: str) -> Tuple[Optional[datetime], Optional[str], Optional[str]]:
    """
    Extract timestamp, time string, and elevation from filename.
    Returns (datetime_obj, time_string, elevation_string)
    """
    # Remove file extension
    name_without_ext = os.path.splitext(filename)[0]
    
    # Look for elevation pattern FIRST (before removing coordinates)
    elevation_string = None
    elevation_pattern = r'_elev__(\d{1,4})__'
    elevation_match = re.search(elevation_pattern, name_without_ext)
    if elevation_match:
        elevation_value = elevation_match.group(1)
        elevation_string = f"Seehöhe: {elevation_value} m"
    
    # Remove coordinates part (everything after last ___)
    if '___' in name_without_ext:
        parts = name_without_ext.split('___')
        caption_part = parts[0]
    else:
        caption_part = name_without_ext
    
    # Find timestamp pattern (YYYYMMDDHHMM or similar)
    timestamp_match = re.search(TIMESTAMP_PATTERN, caption_part)
    
    if timestamp_match:
        try:
            year, month, day, hour, minute = map(int, timestamp_match.groups())
            datetime_obj = datetime(year, month, day, hour, minute)
            
            # Extract time string for captions
            time_string = f"Aufnahmezeitpunkt: {hour:02d}:{minute:02d}"
            
            return datetime_obj, time_string, elevation_string
            
        except ValueError:
            pass
    
    return None, None, None

def extract_datetime_from_filename(filename: str) -> Optional[datetime]:
    """
    Extract date-time from filename using multiple regex patterns.
    Returns datetime object or None if no pattern matches.
    """
    # Remove file extension
    name_without_ext = os.path.splitext(filename)[0]
    
    # Pattern 1: YYYYMMDDHHMM (like 202508041452)
    pattern1 = r'(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})'
    match1 = re.search(pattern1, name_without_ext)
    if match1:
        try:
            year, month, day, hour, minute = map(int, match1.groups())
            return datetime(year, month, day, hour, minute)
        except ValueError:
            pass
    
    # Pattern 2: YYYY-MM-DD_HH-MM-SS
    pattern2 = r'(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})'
    match2 = re.search(pattern2, name_without_ext)
    if match2:
        try:
            year, month, day, hour, minute, second = map(int, match2.groups())
            return datetime(year, month, day, hour, minute, second)
        except ValueError:
            pass
    
    # Pattern 3: YYYYMMDD_HHMMSS
    pattern3 = r'(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})'
    match3 = re.search(pattern3, name_without_ext)
    if match3:
        try:
            year, month, day, hour, minute, second = map(int, match3.groups())
            return datetime(year, month, day, hour, minute, second)
        except ValueError:
            pass
    
    # Pattern 4: YYYY-MM-DD HH:MM:SS
    pattern4 = r'(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})'
    match4 = re.search(pattern4, name_without_ext)
    if match4:
        try:
            year, month, day, hour, minute, second = map(int, match4.groups())
            return datetime(year, month, day, hour, minute, second)
        except ValueError:
            pass
    
    # Pattern 5: YYYYMMDDHHMMSS (like 20250804145200)
    pattern5 = r'(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})'
    match5 = re.search(pattern5, name_without_ext)
    if match5:
        try:
            year, month, day, hour, minute, second = map(int, match5.groups())
            return datetime(year, month, day, hour, minute, second)
        except ValueError:
            pass
    
    return None

class WalkImage:
    """Represents a single image from a walk with date-time and metadata"""
    
    def __init__(self, filename: str, datetime_obj: datetime = None, coordinates: Tuple[float, float] = None):
        self.filename = filename
        self.datetime = datetime_obj
        self.coordinates = coordinates
        self.caption = self._generate_caption()
    
    def _generate_caption(self) -> str:
        """Generate enhanced caption from filename with time and elevation info"""
        # Use consolidated timestamp extraction function
        datetime_obj, time_string, elevation_string = extract_timestamp_info(self.filename)
        
        # Extract text before timestamp (main caption)
        name_without_ext = os.path.splitext(self.filename)[0]
        if '___' in name_without_ext:
            parts = name_without_ext.split('___')
            caption_part = parts[0]
        else:
            caption_part = name_without_ext
        
        # Find timestamp pattern to extract text before it
        timestamp_match = re.search(TIMESTAMP_PATTERN, caption_part)
        
        if timestamp_match:
            # Extract text before timestamp
            timestamp_start = timestamp_match.start()
            main_caption = caption_part[:timestamp_start].strip('_')
        else:
            # No timestamp found, use entire caption part
            main_caption = caption_part
        
        # Clean up main caption (replace underscores with spaces)
        main_caption = main_caption.replace('_', ' ').strip()
        
        # Capitalize first letter
        if main_caption:
            main_caption = main_caption[0].upper() + main_caption[1:]
        else:
            main_caption = "Untitled"
        
        # Combine all parts
        caption_parts = [main_caption]
        metadata_parts = []
        if time_string:
            metadata_parts.append(time_string)
        if elevation_string:
            metadata_parts.append(elevation_string)
        
        if metadata_parts:
            caption_parts.append(f"({', '.join(metadata_parts)})")
        
        return " ".join(caption_parts)

def extract_coordinates_from_filename(filename: str) -> Optional[Tuple[float, float]]:
    """Extract GPS coordinates from filename"""
    # Pattern: filename___longitude_latitude___.extension
    pattern = r'___(-?\d+\.?\d*)_(-?\d+\.?\d*)___'
    match = re.search(pattern, filename)
    
    if match:
        try:
            longitude = float(match.group(1))
            latitude = float(match.group(2))
            return (longitude, latitude)
        except ValueError:
            return None
    
    return None

def haversine_distance(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """Calculate distance between two GPS coordinates using Haversine formula"""
    lon1, lat1 = coord1
    lon2, lat2 = coord2
    
    # Convert to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Earth radius in kilometers
    r = 6371
    
    return c * r

def compress_image(input_path: str, max_size_mb: float = 2.0, quality: int = None) -> bool:
    """Compress an image if it's larger than max_size_mb with automatic quality optimization"""
    if not PIL_AVAILABLE:
        print("WARNING: Compression requested but PIL/Pillow not available. Install with: pip install Pillow")
        return False
    
    # Get current file size
    current_size = os.path.getsize(input_path) / (1024 * 1024)  # MB
    
    if current_size <= max_size_mb:
        print(f"OK {os.path.basename(input_path)}: {current_size:.1f}MB (no compression needed)")
        return False
    
    try:
        # Create backup
        backup_path = input_path + '.backup'
        if not os.path.exists(backup_path):
            shutil.copy2(input_path, backup_path)
            print(f"BACKUP created: {os.path.basename(backup_path)}")
        
        # Open image
        with Image.open(input_path) as img:
            # Convert to RGB if necessary (for JPEG compression)
            if img.mode in ('RGBA', 'LA', 'P'):
                # Create white background for transparent images
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # If quality is specified, use it; otherwise optimize automatically
            if quality is not None:
                img.save(input_path, 'JPEG', quality=quality, optimize=True)
                print(f"COMPRESSED {os.path.basename(input_path)}: {current_size:.1f}MB → {os.path.getsize(input_path) / (1024 * 1024):.1f}MB (quality: {quality})")
            else:
                # Auto-quality optimization: start high, reduce until target size reached
                quality = 95
                while quality > 10:
                    img.save(input_path, 'JPEG', quality=quality, optimize=True)
                    new_size = os.path.getsize(input_path) / (1024 * 1024)
                    
                    if new_size <= max_size_mb:
                        compression_ratio = (1 - new_size / current_size) * 100
                        print(f"COMPRESSED {os.path.basename(input_path)}: {current_size:.1f}MB → {new_size:.1f}MB ({compression_ratio:.0f}% reduction, quality: {quality})")
                        return True
                    
                    quality -= 5
                
                # Use lowest quality and report
                img.save(input_path, 'JPEG', quality=10, optimize=True)
                new_size = os.path.getsize(input_path) / (1024 * 1024)
                compression_ratio = (1 - new_size / current_size) * 100
                print(f"COMPRESSED {os.path.basename(input_path)}: {current_size:.1f}MB → {new_size:.1f}MB ({compression_ratio:.0f}% reduction, min-quality: 10)")
                return True
        
        return True
        
    except Exception as e:
        print(f"ERROR compressing {input_path}: {e}")
        return False

def find_images_in_directory(directory: str, compress: bool = False, max_size_mb: float = 2.0, quality: int = 85) -> List[WalkImage]:
    """Find all images in directory (including those without date-time)"""
    images = []
    image_extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif'}
    
    for filename in os.listdir(directory):
        if any(filename.lower().endswith(ext) for ext in image_extensions):
            filepath = os.path.join(directory, filename)
            if os.path.isfile(filepath):
                # Extract date-time from filename
                datetime_obj, time_string, elevation_string = extract_timestamp_info(filename)
                
                # Extract coordinates if available (optional now)
                coordinates = extract_coordinates_from_filename(filename)
                
                # Only process images if compression is enabled
                if compress:
                    # Pass quality only if explicitly specified, otherwise auto-optimize
                    compress_image(filepath, max_size_mb, quality if quality != 85 else None)
                
                # Create image object - now processes ALL images regardless of datetime
                walk_image = WalkImage(filename, datetime_obj, coordinates)
                images.append(walk_image)
    
    return images

def sort_images_by_datetime(images: List[WalkImage]) -> List[WalkImage]:
    """Sort images: those without datetime first, then by datetime (chronological order)"""
    if not images:
        return []
    
    # Separate images with and without datetime
    images_with_datetime = [img for img in images if img.datetime]
    images_without_datetime = [img for img in images if not img.datetime]
    
    # Sort images with datetime by datetime (earliest first)
    sorted_with_datetime = sorted(images_with_datetime, key=lambda img: img.datetime)
    
    # Return: images without datetime first, then sorted images with datetime
    return images_without_datetime + sorted_with_datetime

def generate_markdown_content(images: List[WalkImage], title: str = "Begehungsbericht", 
                            date: str = "DD-MM-YYYY", location: str = "Gebiet", 
                            template_path: str = None) -> str:
    """Generate complete markdown document using templates"""
    
    # Load template
    template = load_template(template_path)
    
    # Sort images by date-time first (chronological order)
    sorted_images = sort_images_by_datetime(images)
    
    # Calculate total distance along the chronological route (if coordinates available)
    total_distance = 0
    images_with_coordinates = [img for img in sorted_images if img.coordinates]
    if len(images_with_coordinates) > 1:
        for i in range(len(images_with_coordinates) - 1):
            distance = haversine_distance(
                (images_with_coordinates[i].coordinates[0], images_with_coordinates[i].coordinates[1]),
                (images_with_coordinates[i+1].coordinates[0], images_with_coordinates[i+1].coordinates[1])
            )
            total_distance += distance
    else:
        total_distance = 0
    
    # Generate content section with proper markdown formatting
    content = ""
    
    for i, image in enumerate(sorted_images, 1):
        # Standard markdown: image with caption as emphasized text below, including figure counter
        content += f"![{image.caption}](./{image.filename})\n*Abb. {i}: {image.caption}*\n\n"
    
    # Generate coordinates list (in chronological order) if available
    coordinates_list = ""
    if sorted_images and all(img.coordinates for img in sorted_images):
        for i, image in enumerate(sorted_images, 1):
            coordinates_list += f"- Bild {i}: {image.coordinates[0]:.6f}°E, {image.coordinates[1]:.6f}°N\n"
    else:
        # Include all images, marking those without coordinates
        for i, image in enumerate(sorted_images, 1):
            if image.coordinates:
                coordinates_list += f"- Bild {i}: {image.coordinates[0]:.6f}°E, {image.coordinates[1]:.6f}°N\n"
            else:
                coordinates_list += f"- Bild {i}: Koordinaten nicht verfügbar\n"
    
    # Calculate coordinate bounds for scientific template (if coordinates available)
    images_with_coordinates = [img for img in sorted_images if img.coordinates]
    if images_with_coordinates:
        min_lon = min(img.coordinates[0] for img in images_with_coordinates)
        max_lon = max(img.coordinates[0] for img in images_with_coordinates)
        min_lat = min(img.coordinates[1] for img in images_with_coordinates)
        max_lat = max(img.coordinates[1] for img in images_with_coordinates)
        coordinate_bounds = f"{min_lon:.4f}°E - {max_lon:.4f}°E, {min_lat:.4f}°N - {max_lat:.4f}°N"
    else:
        coordinate_bounds = "N/A"
    
    # Detect file extensions from images
    file_extensions = set()
    for image in sorted_images:
        ext = os.path.splitext(image.filename)[1].lower()
        file_extensions.add(ext)
    
    if file_extensions:
        file_format = ", ".join(sorted(file_extensions))
    else:
        file_format = "Unknown"
    
    # Fill template variables
    markdown = template.format(
        title=title,
        date=date,
        location=location,
        content=content,
        total_images=len(sorted_images),
        total_distance=f"{total_distance:.2f}" if total_distance > 0 else "N/A",
        coordinates_list=coordinates_list,
        coordinate_bounds=coordinate_bounds,
        file_format=file_format
    )

    return markdown

def convert_markdown_to_html(markdown_content: str) -> str:
    """Convert markdown content to HTML (reusable function)"""
    html_content = markdown_content
    
    # Remove YAML front matter (metadata between --- markers)
    if html_content.startswith('---'):
        # Find the end of YAML front matter
        parts = html_content.split('---', 2)
        if len(parts) >= 3:
            # Skip first two parts (first --- and YAML content), keep the rest
            html_content = parts[2].strip()
    
    # Add page breaks before main sections - use more explicit page break method
    html_content = re.sub(r'^# (Fotodokumentation)', r'<div style="page-break-before: always; height: 0; overflow: hidden;"></div>\n<h1>\1</h1>', html_content, flags=re.MULTILINE)
    html_content = re.sub(r'^## (Anhänge)', r'<div style="page-break-before: always; height: 0; overflow: hidden;"></div>\n<h2>\1</h2>', html_content, flags=re.MULTILINE)
    
    # Convert images FIRST (before other conversions) with centering
    # Add orientation detection for smart scaling and ratio calculation
    def add_orientation_class(match):
        img_path = match.group(2)
        try:
            from PIL import Image
            with Image.open(img_path) as img:
                width, height = img.size
                ratio = width / height
                orientation = 'landscape' if width > height else 'portrait'
                return f'<figure data-ratio="{ratio:.4f}"><img src="{img_path}" alt="{match.group(1)}" class="walk-image {orientation}">'
        except:
            # Fallback if image analysis fails
            return f'<figure><img src="{img_path}" alt="{match.group(1)}" class="walk-image">'
    
    html_content = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', add_orientation_class, html_content)
    
    # Debug: Print a sample of the HTML after image conversion
    if 'DEBUG_HTML' in os.environ:
        print("DEBUG: HTML after image conversion:")
        print(html_content[:1000])
    
    # Convert image captions to figcaption IMMEDIATELY after image conversion
    # Look for the pattern: <img ...> followed by *Abb. X: caption* and close the figure tag
    # Use a more robust pattern that handles the German caption format
    # First, let's try to match the pattern more precisely
    caption_pattern = r'(<img[^>]+>)\s*\n\*Abb\.\s*(\d+):\s*(.+?)\*'
    if re.search(caption_pattern, html_content, flags=re.DOTALL):
        html_content = re.sub(caption_pattern, r'\1<figcaption><strong>Abb. \2:</strong> \3</figcaption></figure>', html_content, flags=re.DOTALL)
    else:
        # Debug: If no matches found, print what we're looking for
        if 'DEBUG_HTML' in os.environ:
            print("DEBUG: No caption pattern matches found!")
            print("Looking for pattern:", caption_pattern)
            print("Sample HTML content:")
            print(html_content[:2000])
    
    # Debug: Print a sample of the HTML after caption conversion
    if 'DEBUG_HTML' in os.environ:
        print("DEBUG: HTML after caption conversion:")
        print(html_content[:1000])
    
    # Convert headers with data-content attributes for CSS targeting
    html_content = re.sub(r'^# (.+)$', r'<h1 data-content="\1">\1</h1>', html_content, flags=re.MULTILINE)
    html_content = re.sub(r'^## (.+)$', r'<h2 data-content="\1">\1</h2>', html_content, flags=re.MULTILINE)
    html_content = re.sub(r'^### (.+)$', r'<h3 data-content="\1">\1</h3>', html_content, flags=re.MULTILINE)
    
    # Convert bold text
    html_content = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html_content)
    
    # Convert remaining italic text (non-captions)
    html_content = re.sub(r'\*(.+?)\*', r'<em>\1</em>', html_content)
    
    # Convert horizontal rules
    html_content = re.sub(r'^---$', r'<hr>', html_content, flags=re.MULTILINE)
    
    # Convert line breaks to <br> tags (but preserve image blocks)
    # Split by double newlines to preserve paragraph structure
    paragraphs = html_content.split('\n\n')
    processed_paragraphs = []
    
    for para in paragraphs:
        if '<img' in para:
            # This is an image paragraph, keep it as is
            processed_paragraphs.append(para)
        else:
            # Regular paragraph, convert single newlines to <br>
            para = para.replace('\n', '<br>')
            processed_paragraphs.append(para)
    
    # Join paragraphs back together
    html_content = '\n\n'.join(processed_paragraphs)
    
    return html_content

def convert_markdown_to_pdf(markdown_file: str, output_pdf: str = None) -> bool:
    """Convert markdown file to PDF using wkhtmltopdf"""
    if not os.path.exists(markdown_file):
        print(f"ERROR: Markdown file not found: {markdown_file}")
        return False
    
    if not check_wkhtmltopdf_installation():
        print("ERROR: wkhtmltopdf not found. Please install wkhtmltopdf first.")
        print("Download from: https://wkhtmltopdf.org/downloads.html")
        return False
    
    if output_pdf is None:
        output_pdf = markdown_file.replace('.md', '.pdf')
    
    try:
        print(f"Converting {markdown_file} to PDF...")
        print("Note: HTML will be regenerated from current markdown content")
        
        # Read markdown content (including any manual edits)
        with open(markdown_file, 'r', encoding='utf-8') as f:
            markdown_content = f.read()
        
        # Convert markdown to HTML using the same function
        html_content = convert_markdown_to_html(markdown_content)
        
        # Create HTML wrapper with external CSS reference
        full_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Walk Documentation</title>
    <link rel="stylesheet" href="pdf_styles.css">
</head>
<body>
{html_content}
</body>
</html>"""
        
        # Write/overwrite HTML file (same as first step)
        html_file = markdown_file.replace('.md', '.html')
        
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(full_html)
        
        print(f"[OK] HTML file updated: {html_file}")
        
        # Generate PDF using wkhtmltopdf from the HTML file
        cmd = [
            'wkhtmltopdf',
            '--page-size', 'A4',
            '--margin-top', '20mm',
            '--margin-right', '15mm',
            '--margin-bottom', '20mm',
            '--margin-left', '15mm',
            '--encoding', 'utf-8',
            '--enable-local-file-access',
            '--print-media-type',
            '--no-outline',
            '--footer-right', '[page] / [topage]',
            '--footer-text', 'Bericht [date]',
            '--footer-font-size', '7',
            '--footer-font-name', 'Courier New',
            html_file,
            output_pdf
        ]
        
        print(f"Generating PDF from updated HTML...")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        
        if result.returncode == 0:
            print(f"[OK] Successfully created PDF: {output_pdf}")
            return True
        else:
            print(f"ERROR generating PDF:")
            print(f"STDOUT: {result.stdout}")
            print(f"STDERR: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"ERROR converting to PDF: {e}")
        return False



def main():
    parser = argparse.ArgumentParser(description='Walk Image Processor - Generate Markdown or Convert to PDF')
    parser.add_argument('-o', '--output', default='walk_documentation.md',
                       help='Output markdown file (default: walk_documentation.md)')
    parser.add_argument('-t', '--title', default='Begehungsbericht',
                       help='Document title')
    parser.add_argument('-d', '--date', default=None,
                       help='Document date (DD-MM-YYYY format, default: current date)')
    parser.add_argument('-l', '--location', default='Gebiet',
                       help='Location/area name')
    parser.add_argument('-c', '--compress', action='store_true',
                       help='Compress images before processing (reduces file size)')
    parser.add_argument('-m', '--max-size', type=float, default=2.0,
                       help='Maximum image size in MB when compressing (default: 2.0)')
    parser.add_argument('-q', '--quality', type=int, default=85,
                       help='JPEG quality when compressing 1-100 (default: auto-optimize, only with -c)')
    parser.add_argument('--dry-run', action='store_true',
                       help='Show what would be done without creating files')
    parser.add_argument('--help-browser', action='store_true',
                       help='Open help documentation in browser')
    parser.add_argument('-T', '--template', default=None,
                       help='Custom template file path (default: uses built-in template)')
    
    # PDF conversion mode
    parser.add_argument('-p', '--pdf', action='store_true',
                       help='Convert existing markdown file to PDF (instead of generating markdown)')
    parser.add_argument('-i', '--input', default=None,
                       help='Input markdown file for PDF conversion (must be .md file, default: uses -o value)')
    
    args = parser.parse_args()
    
    # Handle help browser request FIRST
    if args.help_browser:
        import webbrowser
        script_dir = os.path.dirname(os.path.abspath(__file__))
        system_dir = os.path.dirname(script_dir)
        help_file = os.path.join(system_dir, "docs", "help.html")
        if os.path.exists(help_file):
            webbrowser.open(f"file:///{help_file.replace(os.sep, '/')}")
            print("Help documentation opened in browser")
        else:
            print("ERROR: Help file not found. Please reinstall the system.")
        return
    
    # PDF conversion mode SECOND - BEFORE any image processing
    if args.pdf:
        input_file = args.input if args.input else args.output
        
        # Validate input file extension for -i parameter
        if args.input and not args.input.endswith('.md'):
            print(f"ERROR: Input file '{args.input}' must be a markdown file (.md)")
            print("The -i parameter only accepts markdown files, not HTML or other formats.")
            return
        
        # For backward compatibility, still handle .html/.pdf extensions in output filename
        if not input_file.endswith('.md'):
            print(f"ERROR: Input file '{input_file}' must be a markdown file (.md)")
            print("The -i parameter only accepts markdown files")
            return
        
        if convert_markdown_to_pdf(input_file):
            print(f"\nPDF generation completed successfully!")
            print(f"Output: {input_file.replace('.md', '.pdf')}")
        else:
            print(f"\nPDF generation failed!")
        return
    
    # Copy CSS files to working directory for later use
    script_dir = os.path.dirname(os.path.abspath(__file__))
    pdf_css_source = os.path.join(script_dir, "..", "styles", "pdf_styles.css")
    pdf_css_dest = "pdf_styles.css"
    
    # Check for existing files and warn user BEFORE copying/processing
    existing_files = []
    if os.path.exists(args.output):
        existing_files.append(args.output)
    html_output = args.output.replace('.md', '.html')
    if os.path.exists(html_output):
        existing_files.append(html_output)
    if os.path.exists(pdf_css_dest):
        existing_files.append(pdf_css_dest)
    
    if existing_files:
        print("\n" + "=" * 60)
        print("CAUTION: The following files will be OVERWRITTEN:")
        for file in existing_files:
            print(f"      * {file}")
        print("\nPress Enter to continue or Ctrl+C to cancel...")
        try:
            input()
        except KeyboardInterrupt:
            print("\nOperation cancelled by user.")
            return
        print("Continuing with file generation...")
        print("=" * 60)
    
    # Now copy CSS files after user confirmation
    if os.path.exists(pdf_css_source):
        import shutil
        shutil.copy2(pdf_css_source, pdf_css_dest)
        print(f"[INFO] CSS file copied: {pdf_css_dest}")
    
    print("=" * 40)
    
    # Set default date if not provided
    if args.date is None:
        args.date = datetime.now().strftime("%d-%m-%Y")
    
    print("Walk Image Processor for Scientific Reports")
    print("=" * 60)
    print(f"Working directory: {os.getcwd()}")
    print(f"Output: {args.output}")
    print(f"Title: {args.title}")
    print(f"Date: {args.date}")
    print(f"Location: {args.location}")
    if args.template:
        print(f"Template: {args.template}")
    else:
        print("Template: Default")
    if args.compress:
        print(f"Compression: Enabled (max {args.max_size}MB, quality {args.quality})")
    else:
        print("Compression: Disabled")
    print("=" * 60)
    
    # Find images in current directory
    print("\nSearching for images in current directory...")
    images = find_images_in_directory('.', 
                                     compress=args.compress, 
                                     max_size_mb=args.max_size, 
                                     quality=args.quality)
    
    if not images:
        print("ERROR: No images found!")
        print("\nExpected filename patterns:")
        print("- noexif_media_202508041452___13.204777_47.321468___.jpg (with timestamp + coordinates)")
        print("- filename_YYYYMMDDHHMM___longitude_latitude___.jpg (with timestamp + coordinates)")
        print("- filename_YYYY-MM-DD_HH-MM-SS___longitude_latitude___.jpg (with timestamp + coordinates)")
        print("- overview.jpg (any image file - will be processed)")
        return
    
    print(f"Found {len(images)} images")
    
    # Sort images: those without datetime first, then by chronological order
    print("\nSorting images: those without datetime first, then by chronological order...")
    sorted_images = sort_images_by_datetime(images)
    
    print("Image order:")
    for i, image in enumerate(sorted_images, 1):
        print(f"  {i:2d}. {image.filename}")
        print(f"      Caption: {image.caption}")
        if image.datetime:
            print(f"      Date/Time: {image.datetime.strftime('%Y-%m-%d %H:%M:%S')}")
        else:
            print("      Date/Time: None (no timestamp in filename)")
        if image.coordinates:
            print(f"      Coordinates: {image.coordinates[0]:.6f}°E, {image.coordinates[1]:.6f}°N")
        else:
            print(f"      Coordinates: Not available")
    
    if args.dry_run:
        print("\nDry run - no files created")
        return
    
    # Generate markdown with template
    if args.template:
        print(f"\nGenerating markdown using custom template: {args.template}")
    else:
        print("\nGenerating markdown using default template")
    markdown_content = generate_markdown_content(
        images,  # Pass original images, function will sort them internally
        title=args.title, 
        date=args.date, 
        location=args.location,
        template_path=args.template
    )
    
    # Write markdown file
    print(f"Writing to: {args.output}")
    try:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(markdown_content)
        print(f"[OK] Successfully created {args.output}")
        
        # Generate HTML file for PDF conversion
        html_output = args.output.replace('.md', '.html')
        print(f"Generating HTML for PDF conversion: {html_output}")
        
        # Convert markdown to HTML
        html_content = convert_markdown_to_html(markdown_content)
        
        # Create full HTML document with CSS link
        full_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Walk Documentation</title>
    <link rel="stylesheet" href="pdf_styles.css">
</head>
<body>
{html_content}
</body>
</html>"""
        
        with open(html_output, 'w', encoding='utf-8') as f:
            f.write(full_html)
        
        print(f"[OK] Successfully created {html_output}")
        print(f"[INFO] HTML file ready for PDF conversion with: wip -p")
            
    except Exception as e:
        print(f"ERROR writing file: {e}")

if __name__ == "__main__":
    main()
