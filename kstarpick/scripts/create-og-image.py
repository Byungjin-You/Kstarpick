#!/usr/bin/env python3
"""
기본 Open Graph 이미지 생성 스크립트
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_og_image():
    # 이미지 크기 (Facebook OG 권장 사이즈)
    width, height = 1200, 630
    
    # 그라디언트 배경 생성
    img = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(img)
    
    # 핑크 그라디언트 배경
    for y in range(height):
        # 핑크에서 보라색으로 그라디언트
        ratio = y / height
        r = int(255 - (255 - 139) * ratio)  # 255 -> 139
        g = int(20 + (92 - 20) * ratio)     # 20 -> 92
        b = int(147 + (207 - 147) * ratio)  # 147 -> 207
        
        draw.rectangle([0, y, width, y+1], fill=(r, g, b))
    
    # 장식 원들 추가
    # 큰 반투명 원
    circle_overlay = Image.new('RGBA', (width, height), (255, 255, 255, 0))
    circle_draw = ImageDraw.Draw(circle_overlay)
    
    # 좌상단 큰 원
    circle_draw.ellipse([50, 50, 300, 300], fill=(255, 255, 255, 30))
    # 우하단 중간 원  
    circle_draw.ellipse([800, 350, 1050, 600], fill=(255, 255, 255, 20))
    # 중앙 작은 원
    circle_draw.ellipse([500, 200, 650, 350], fill=(255, 255, 255, 15))
    
    # 원 오버레이 합성
    img = Image.alpha_composite(img.convert('RGBA'), circle_overlay).convert('RGB')
    draw = ImageDraw.Draw(img)
    
    # 텍스트 추가
    try:
        # 시스템 폰트 사용 (Arial 또는 기본 폰트)
        title_font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 80)
        subtitle_font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 40)
        desc_font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 28)
    except:
        # 폰트 로드 실패 시 기본 폰트 사용
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        desc_font = ImageFont.load_default()
    
    # 제목
    title_text = "KstarPick"
    title_bbox = draw.textbbox((0, 0), title_text, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (width - title_width) // 2
    draw.text((title_x, 180), title_text, fill='white', font=title_font)
    
    # 부제목
    subtitle_text = "K-Pop News Portal"
    subtitle_bbox = draw.textbbox((0, 0), subtitle_text, font=subtitle_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    subtitle_x = (width - subtitle_width) // 2
    draw.text((subtitle_x, 280), subtitle_text, fill='white', font=subtitle_font)
    
    # 설명
    desc_text = "Latest K-Pop, K-Drama & Korean Entertainment News"
    desc_bbox = draw.textbbox((0, 0), desc_text, font=desc_font)
    desc_width = desc_bbox[2] - desc_bbox[0]
    desc_x = (width - desc_width) // 2
    draw.text((desc_x, 380), desc_text, fill='rgba(255,255,255,0.9)', font=desc_font)
    
    return img

def create_news_og_image():
    """뉴스용 기본 OG 이미지"""
    width, height = 1200, 630
    
    # 다크 그라디언트 배경
    img = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(img)
    
    # 다크 핑크 그라디언트
    for y in range(height):
        ratio = y / height
        r = int(99 - (99 - 59) * ratio)    # 99 -> 59
        g = int(102 - (102 - 39) * ratio)  # 102 -> 39
        b = int(241 - (241 - 176) * ratio) # 241 -> 176
        
        draw.rectangle([0, y, width, y+1], fill=(r, g, b))
    
    # 뉴스 아이콘 영역
    try:
        title_font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 70)
        subtitle_font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 35)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
    
    # 뉴스 텍스트
    title_text = "📰 KstarPick News"
    title_bbox = draw.textbbox((0, 0), title_text, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (width - title_width) // 2
    draw.text((title_x, 220), title_text, fill='white', font=title_font)
    
    subtitle_text = "Latest Korean Entertainment Updates"
    subtitle_bbox = draw.textbbox((0, 0), subtitle_text, font=subtitle_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    subtitle_x = (width - subtitle_width) // 2
    draw.text((subtitle_x, 320), subtitle_text, fill='white', font=subtitle_font)
    
    return img

if __name__ == "__main__":
    # public/images 디렉토리 확인
    images_dir = "../public/images"
    os.makedirs(images_dir, exist_ok=True)
    
    # 기본 OG 이미지 생성
    print("기본 OG 이미지 생성 중...")
    og_image = create_og_image()
    og_image.save(f"{images_dir}/og-image.jpg", "JPEG", quality=95)
    print(f"저장됨: {images_dir}/og-image.jpg")
    
    # 뉴스용 OG 이미지 생성
    print("뉴스용 OG 이미지 생성 중...")
    news_og_image = create_news_og_image()
    news_og_image.save(f"{images_dir}/default-news-og.jpg", "JPEG", quality=95)
    print(f"저장됨: {images_dir}/default-news-og.jpg")
    
    print("✅ OG 이미지 생성 완료!")