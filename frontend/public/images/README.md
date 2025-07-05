# CMS Image Assets

This directory contains all image assets for the Courier Management System (CMS) application.

## Directory Structure

### `/hero/`
Contains hero section images for the landing page.

### `/services/`
Contains service-related images for the services section.

### `/icons/`
Contains icon assets and graphics.

## Root Level Images

### About Section Image
- **Filename**: `about-delivery.jpg`
- **Dimensions**: 800x400px (recommended)
- **Description**: Image for the about section showing delivery/logistics operations

## General Guidelines

- All images should be optimized for web (compressed JPG/PNG)
- Maintain consistent aspect ratios for similar image types
- Use meaningful, descriptive filenames
- All components include fallback mechanisms using Unsplash images
- Images are automatically handled with error fallbacks in the `ImageWithFallback` component

## Fallback Mechanism

The application uses an `ImageWithFallback` component that:
1. Attempts to load the local image first
2. Falls back to a curated Unsplash image if local image fails
3. Provides seamless user experience even when images are missing

## Notes

If you're seeing 404 errors for images in the browser console, the application will still function correctly due to the fallback system, but you may want to add the actual image files to improve performance and branding consistency.

## Image Structure

```
images/
├── logo.svg                    # Main CMS logo (SVG format)
├── services/
│   ├── sea-freight.jpg        # Sea freight service image
│   ├── air-freight.jpg        # Air freight service image
│   └── package-forwarding.jpg # Package forwarding service image
├── hero/
│   └── delivery-hero.jpg      # Hero section background image
└── icons/
    └── branch-icon.svg        # Branch location icons
```

## Adding Your Own Images

### 1. Service Images
Add these images to the `services/` folder:
- **sea-freight.jpg** (400x300px recommended)
- **air-freight.jpg** (400x300px recommended) 
- **package-forwarding.jpg** (400x300px recommended)

### 2. Hero Images
Add these images to the `hero/` folder:
- **delivery-hero.jpg** (1920x1080px recommended)

### 3. About Section
Add this image to the root images folder:
- **about-delivery.jpg** (800x600px recommended)

### 4. Logo
Replace the existing **logo.svg** or add **logo.png** (120x40px recommended)

## Image Requirements

- **Format**: JPG, PNG, or SVG
- **Quality**: High resolution for best display
- **Size**: Optimized for web (under 500KB per image)
- **Aspect Ratios**: 
  - Service images: 4:3 ratio
  - Hero images: 16:9 ratio
  - Logo: 3:1 ratio

## Fallback System

If local images are not found, the application automatically uses:
- High-quality Unsplash images with courier/logistics themes
- Professional stock photography
- Consistent branding and color schemes

## Image Sources

For professional courier and logistics images, consider:
- [Unsplash](https://unsplash.com/s/photos/courier) - Free high-quality images
- [Pexels](https://www.pexels.com/search/delivery/) - Free stock photos
- [Freepik](https://www.freepik.com/free-photos-vectors/logistics) - Vector graphics and photos

## Usage in Components

Images are referenced using relative paths:
```jsx
<img src="/images/services/sea-freight.jpg" alt="Sea Freight" />
```

The application includes fallback handling:
```jsx
<ImageWithFallback 
  src="/images/services/sea-freight.jpg"
  fallbackSrc="https://images.unsplash.com/..."
  alt="Sea Freight"
/>
``` 