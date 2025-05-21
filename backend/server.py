from fastapi import FastAPI, APIRouter, HTTPException, Depends, Body, File, UploadFile, BackgroundTasks, Form
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import base64
import shutil
import ffmpeg
from pathlib import Path
import tempfile
import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
import openai
from PIL import Image, ImageFont, ImageDraw
import io
import requests
import json
from datetime import datetime, timedelta
import time
import re

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Set up OpenAI API key
openai.api_key = os.environ.get('OPENAI_API_KEY')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create media directories if they don't exist
MEDIA_DIR = ROOT_DIR / "media"
MEDIA_DIR.mkdir(exist_ok=True)

IMAGES_DIR = MEDIA_DIR / "images"
IMAGES_DIR.mkdir(exist_ok=True)

AUDIO_DIR = MEDIA_DIR / "audio"
AUDIO_DIR.mkdir(exist_ok=True)

VIDEOS_DIR = MEDIA_DIR / "videos"
VIDEOS_DIR.mkdir(exist_ok=True)

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class StoryRequest(BaseModel):
    prompt: str
    duration: str  # "30-60", "60-90", "90-120" seconds

class StoryResponse(BaseModel):
    story: str
    duration: str
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

class ImageGenerationRequest(BaseModel):
    story_id: str
    style: str  # "realistic", "cartoon", "lego", "fashion", "painting", "neon"

class ImageResponse(BaseModel):
    image_urls: List[str]
    story_id: str

class SubtitleCustomization(BaseModel):
    font: str
    color: str
    placement: str  # "top", "middle", "bottom"
    background: str  # "none", "solid", "gradient"

class VoiceGenerationRequest(BaseModel):
    story_id: str
    voice: str  # "alloy", "echo", "fable", "onyx", "nova", "shimmer"

class VideoGenerationRequest(BaseModel):
    story_id: str
    subtitle_customization: SubtitleCustomization
    voice_id: str

class Video(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    duration: str
    story_id: str
    video_url: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PublishRequest(BaseModel):
    video_id: str
    platform: str  # "tiktok", "youtube"
    title: str
    description: str
    publish_date: datetime
    visibility: str  # "public", "private"

class Settings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tiktok_api_key: Optional[str] = None
    youtube_api_key: Optional[str] = None

# Helper functions
async def get_story(story_id: str):
    story = await db.stories.find_one({"id": story_id})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return story

async def get_video(video_id: str):
    video = await db.videos.find_one({"id": video_id})
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return video

async def check_auth(password: str = Body(...)):
    # Simple password authentication
    user = await db.users.find_one({})
    if not user or user["password"] != password:
        raise HTTPException(status_code=401, detail="Authentication failed")
    return user

# Routes
@api_router.post("/auth", response_model=dict)
async def authenticate(password: str = Body(..., embed=True)):
    # Check if any user exists
    user_count = await db.users.count_documents({})
    
    if user_count == 0:
        # First login, create user
        user = User(password=password)
        await db.users.insert_one(user.dict())
        return {"message": "User created successfully", "authenticated": True}
    
    # Check password
    user = await db.users.find_one({})
    if user["password"] != password:
        raise HTTPException(status_code=401, detail="Authentication failed")
    
    return {"message": "Authentication successful", "authenticated": True}

@api_router.post("/change-password")
async def change_password(old_password: str = Body(...), new_password: str = Body(...)):
    user = await db.users.find_one({})
    if not user or user["password"] != old_password:
        raise HTTPException(status_code=401, detail="Authentication failed")
    
    await db.users.update_one({"id": user["id"]}, {"$set": {"password": new_password}})
    return {"message": "Password changed successfully"}

@api_router.post("/generate-story", response_model=StoryResponse)
async def generate_story(request: StoryRequest):
    try:
        # Determine target word count based on duration
        duration_map = {
            "30-60": (150, 300),  # 150-300 words for 30-60 seconds
            "60-90": (300, 450),  # 300-450 words for 60-90 seconds
            "90-120": (450, 600)  # 450-600 words for 90-120 seconds
        }
        
        min_words, max_words = duration_map.get(request.duration, (150, 300))
        
        # Generate story using OpenAI
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": f"You are a creative story writer. Create a short, engaging story based on the following prompt. The story should be suitable for a short video between {request.duration} seconds. Use between {min_words} and {max_words} words. Make it captivating, with a clear beginning, middle, and end."},
                {"role": "user", "content": request.prompt}
            ]
        )
        
        story = response.choices[0].message.content
        
        # Save to database
        story_response = StoryResponse(
            story=story,
            duration=request.duration
        )
        
        await db.stories.insert_one({
            "id": story_response.id,
            "story": story_response.story,
            "duration": story_response.duration,
            "created_at": datetime.utcnow()
        })
        
        return story_response
    
    except Exception as e:
        logging.error(f"Story generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating story: {str(e)}")

@api_router.post("/generate-images", response_model=ImageResponse)
async def generate_images(request: ImageGenerationRequest):
    try:
        # Get story from database
        story = await get_story(request.story_id)
        
        # Determine number of images based on duration
        duration_range = story["duration"]
        if duration_range == "30-60":
            num_images = 6  # ~1 image per 10 seconds
        elif duration_range == "60-90":
            num_images = 10  # ~1 image per 9 seconds
        else:  # 90-120
            num_images = 15  # ~1 image per 8 seconds
        
        # Split the story into segments
        story_text = story["story"]
        segments = split_story_into_segments(story_text, num_images)
        
        # Generate an image for each segment
        image_urls = []
        
        for i, segment in enumerate(segments):
            # Generate prompt for DALL-E based on the segment and style
            style_prompt = get_style_prompt(request.style)
            
            # Generate the image
            response = openai.images.generate(
                model="dall-e-3",
                prompt=f"{style_prompt} {segment}. Full HD (1920x1080) aspect ratio.",
                size="1792x1024",
                quality="hd",
                n=1
            )
            
            # Get the image URL from the response
            image_url = response.data[0].url
            
            # Download the image and save locally
            image_response = requests.get(image_url)
            image_response.raise_for_status()
            
            image_filename = f"{request.story_id}_{i}.png"
            image_path = IMAGES_DIR / image_filename
            
            with open(image_path, "wb") as f:
                f.write(image_response.content)
            
            # Add the local path to the list of image URLs
            image_urls.append(f"/api/media/images/{image_filename}")
        
        # Update the story in the database with the image URLs
        await db.stories.update_one(
            {"id": request.story_id},
            {"$set": {"images": image_urls, "style": request.style}}
        )
        
        return ImageResponse(image_urls=image_urls, story_id=request.story_id)
    
    except Exception as e:
        logging.error(f"Image generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating images: {str(e)}")

@api_router.post("/generate-voice", response_model=dict)
async def generate_voice(request: VoiceGenerationRequest):
    try:
        # Get story from database
        story = await get_story(request.story_id)
        
        # Generate audio using OpenAI TTS
        response = openai.audio.speech.create(
            model="tts-1-hd",
            voice=request.voice,
            input=story["story"]
        )
        
        # Save the audio file
        audio_filename = f"{request.story_id}.mp3"
        audio_path = AUDIO_DIR / audio_filename
        
        with open(audio_path, "wb") as f:
            f.write(response.content)
        
        # Update the story in the database with the audio URL
        audio_url = f"/api/media/audio/{audio_filename}"
        await db.stories.update_one(
            {"id": request.story_id},
            {"$set": {"audio_url": audio_url, "voice": request.voice}}
        )
        
        return {"audio_url": audio_url, "story_id": request.story_id}
    
    except Exception as e:
        logging.error(f"Voice generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating voice: {str(e)}")

@api_router.post("/generate-video", response_model=dict)
async def generate_video(request: VideoGenerationRequest, background_tasks: BackgroundTasks):
    try:
        # Get story from database
        story = await get_story(request.story_id)
        
        if "images" not in story or not story["images"]:
            raise HTTPException(status_code=400, detail="No images available for this story")
        
        if "audio_url" not in story or not story["audio_url"]:
            raise HTTPException(status_code=400, detail="No audio available for this story")
        
        # Create a unique ID for the video
        video_id = str(uuid.uuid4())
        
        # Generate the video asynchronously
        background_tasks.add_task(
            create_video, 
            story, 
            request.subtitle_customization, 
            video_id,
            request.voice_id
        )
        
        return {
            "message": "Video generation started", 
            "video_id": video_id, 
            "story_id": request.story_id
        }
    
    except Exception as e:
        logging.error(f"Video generation request error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error starting video generation: {str(e)}")

@api_router.get("/videos", response_model=List[dict])
async def get_videos():
    videos = await db.videos.find().sort("created_at", -1).to_list(100)
    for video in videos:
        video["id"] = video["id"]  # Ensure ID is included
        if "_id" in video:
            del video["_id"]  # Remove MongoDB's _id
    return videos

@api_router.get("/video/{video_id}")
async def get_video_details(video_id: str):
    video = await get_video(video_id)
    if "_id" in video:
        del video["_id"]
    return video

@api_router.delete("/video/{video_id}")
async def delete_video(video_id: str):
    video = await get_video(video_id)
    
    # Delete the video file
    video_path = VIDEOS_DIR / f"{video_id}.mp4"
    if video_path.exists():
        video_path.unlink()
    
    # Delete from database
    await db.videos.delete_one({"id": video_id})
    
    return {"message": "Video deleted successfully"}

@api_router.get("/media/images/{filename}")
async def get_image(filename: str):
    image_path = IMAGES_DIR / filename
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(image_path)

@api_router.get("/media/audio/{filename}")
async def get_audio(filename: str):
    audio_path = AUDIO_DIR / filename
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio not found")
    return FileResponse(audio_path)

@api_router.get("/media/videos/{filename}")
async def get_video(filename: str):
    video_path = VIDEOS_DIR / filename
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(video_path)

@api_router.get("/video-status/{video_id}")
async def get_video_status(video_id: str):
    video = await db.videos.find_one({"id": video_id})
    if not video:
        # Check if it's still processing
        processing = await db.video_processing.find_one({"video_id": video_id})
        if processing:
            return {"status": "processing", "progress": processing.get("progress", 0)}
        else:
            return {"status": "not_found"}
    
    return {"status": "completed", "video_url": video["video_url"]}

@api_router.post("/publish-video")
async def publish_video(request: PublishRequest):
    # This would handle the actual publishing to TikTok or YouTube
    # For the MVP, we'll just log the request and simulate a response
    
    video = await get_video(request.video_id)
    
    # Save the publish schedule to the database
    publish_entry = {
        "id": str(uuid.uuid4()),
        "video_id": request.video_id,
        "platform": request.platform,
        "title": request.title,
        "description": request.description,
        "publish_date": request.publish_date,
        "visibility": request.visibility,
        "status": "scheduled",
        "created_at": datetime.utcnow()
    }
    
    await db.publish_schedule.insert_one(publish_entry)
    
    return {
        "message": f"Video scheduled for publishing on {request.platform}",
        "publish_id": publish_entry["id"]
    }

@api_router.get("/publish-schedule", response_model=List[dict])
async def get_publish_schedule():
    schedule = await db.publish_schedule.find().sort("publish_date", 1).to_list(100)
    for entry in schedule:
        if "_id" in entry:
            del entry["_id"]
    return schedule

@api_router.post("/settings", response_model=Settings)
async def update_settings(settings: Settings = Body(...)):
    # Get existing settings or create new
    existing = await db.settings.find_one({})
    
    if existing:
        # Update existing settings
        await db.settings.update_one({}, {"$set": settings.dict(exclude_unset=True)})
        settings.id = existing["id"]
    else:
        # Create new settings
        await db.settings.insert_one(settings.dict())
    
    return settings

@api_router.get("/settings", response_model=Settings)
async def get_settings():
    settings = await db.settings.find_one({})
    if not settings:
        # Return default settings
        return Settings()
    
    if "_id" in settings:
        del settings["_id"]
    
    return Settings(**settings)

# Utility functions
def split_story_into_segments(story: str, num_segments: int) -> List[str]:
    """Split a story into roughly equal segments for image generation."""
    # Split into sentences
    sentences = re.split(r'(?<=[.!?])\s+', story)
    
    # Group sentences into segments
    segments = []
    segment_size = max(1, len(sentences) // num_segments)
    
    for i in range(0, len(sentences), segment_size):
        segment = " ".join(sentences[i:i + segment_size])
        segments.append(segment)
    
    # Ensure we don't have too many segments
    while len(segments) > num_segments:
        # Merge the last two segments
        segments[-2] = segments[-2] + " " + segments[-1]
        segments.pop()
    
    # If we have too few segments, duplicate some
    while len(segments) < num_segments:
        # Find the longest segment and split it
        longest_idx = max(range(len(segments)), key=lambda i: len(segments[i]))
        longest = segments[longest_idx]
        
        # Split the segment approximately in half
        half = len(longest) // 2
        segments[longest_idx] = longest[:half]
        segments.insert(longest_idx + 1, longest[half:])
    
    return segments

def get_style_prompt(style: str) -> str:
    """Get a prompt prefix for a given image style."""
    style_prompts = {
        "realistic": "Create a photorealistic image in high detail of",
        "cartoon": "Create a colorful cartoon style image of",
        "lego": "Create an image that looks like it was built with Lego bricks showing",
        "fashion": "Create a high-fashion editorial photography style image of",
        "painting": "Create an oil painting in the style of Renaissance masters depicting",
        "neon": "Create a cyberpunk neon-lit urban scene at night showing"
    }
    
    return style_prompts.get(style, "Create an image of")

async def create_video(story: dict, subtitle_customization: SubtitleCustomization, video_id: str, voice_id: str):
    """Generate a video by combining images, audio, and subtitles."""
    try:
        # Create a processing entry to track progress
        await db.video_processing.insert_one({
            "video_id": video_id,
            "story_id": story["id"],
            "progress": 0,
            "started_at": datetime.utcnow()
        })
        
        # Get the images
        image_paths = [Path(MEDIA_DIR) / image_url.replace("/api/media/", "") for image_url in story["images"]]
        
        # Get the audio path
        audio_path = Path(MEDIA_DIR) / story["audio_url"].replace("/api/media/", "")
        
        # Create a temporary directory for processing
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_dir_path = Path(temp_dir)
            
            # Get audio duration using ffmpeg
            probe = ffmpeg.probe(str(audio_path))
            audio_duration = float(probe['format']['duration'])
            
            # Calculate duration for each image
            image_duration = audio_duration / len(image_paths)
            
            # Prepare text for subtitles
            story_text = story["story"]
            
            # Split story text into segments for each image
            text_segments = split_story_into_segments(story_text, len(image_paths))
            
            # Update progress
            await db.video_processing.update_one(
                {"video_id": video_id},
                {"$set": {"progress": 10}}
            )
            
            # Create frames with subtitles
            frame_paths = []
            
            for i, (image_path, text_segment) in enumerate(zip(image_paths, text_segments)):
                # Update progress periodically
                if i % 3 == 0:
                    progress = 10 + int((i / len(image_paths)) * 40)
                    await db.video_processing.update_one(
                        {"video_id": video_id},
                        {"$set": {"progress": progress}}
                    )
                
                # Add subtitles to image
                frame_path = temp_dir_path / f"frame_{i:03d}.png"
                add_subtitle_to_image(
                    str(image_path),
                    text_segment,
                    str(frame_path),
                    subtitle_customization
                )
                frame_paths.append(frame_path)
            
            # Update progress
            await db.video_processing.update_one(
                {"video_id": video_id},
                {"$set": {"progress": 50}}
            )
            
            # Create video from frames
            video_with_frames = temp_dir_path / "frames_video.mp4"
            
            frame_inputs = []
            for i, frame_path in enumerate(frame_paths):
                # Create input for each frame with duration
                frame_input = ffmpeg.input(str(frame_path), loop=1, t=image_duration)
                frame_inputs.append(frame_input)
            
            # Concatenate all frame inputs
            concat_frames = ffmpeg.concat(*frame_inputs, v=1, a=0)
            
            # Add audio to the video
            audio_input = ffmpeg.input(str(audio_path))
            
            # Create vertical format video (9:16 ratio)
            output_video = VIDEOS_DIR / f"{video_id}.mp4"
            
            # Run ffmpeg command
            ffmpeg.output(
                concat_frames,
                audio_input.audio,
                str(output_video),
                vf="scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1",
                video_bitrate="2M",
                audio_bitrate="160k"
            ).run(overwrite_output=True, quiet=True)
            
            # Update progress
            await db.video_processing.update_one(
                {"video_id": video_id},
                {"$set": {"progress": 90}}
            )
            
            # Create video entry in database
            video_url = f"/api/media/videos/{video_id}.mp4"
            video = {
                "id": video_id,
                "title": f"Video from {story.get('id')}",
                "story_id": story["id"],
                "duration": story["duration"],
                "video_url": video_url,
                "created_at": datetime.utcnow()
            }
            
            await db.videos.insert_one(video)
            
            # Clean up the processing entry
            await db.video_processing.delete_one({"video_id": video_id})
            
    except Exception as e:
        logging.error(f"Video generation error: {str(e)}")
        # Update the processing entry with the error
        await db.video_processing.update_one(
            {"video_id": video_id},
            {"$set": {
                "error": str(e),
                "status": "failed"
            }}
        )

def add_subtitle_to_image(image_path: str, text: str, output_path: str, customization: SubtitleCustomization):
    """Add subtitle text to an image."""
    # Open the image
    img = Image.open(image_path)
    
    # Create a drawing context
    draw = ImageDraw.Draw(img)
    
    # We don't have many fonts installed in the environment, so use a default one
    font_size = 40
    try:
        font = ImageFont.truetype(customization.font, font_size)
    except:
        # Fallback to default font
        font = ImageFont.load_default()
    
    # Wrap text to fit image width (80% of image width)
    width = img.width * 0.8
    wrapped_text = wrap_text(text, font, width)
    
    # Get text dimensions
    text_width, text_height = draw.textbbox((0, 0), wrapped_text, font=font)[2:4]
    
    # Define text position based on placement setting
    if customization.placement == "top":
        position = ((img.width - text_width) / 2, img.height * 0.1)
    elif customization.placement == "middle":
        position = ((img.width - text_width) / 2, (img.height - text_height) / 2)
    else:  # "bottom"
        position = ((img.width - text_width) / 2, img.height * 0.8 - text_height)
    
    # Draw text background if specified
    if customization.background != "none":
        # Add padding around text
        padding = 10
        background_box = [
            position[0] - padding,
            position[1] - padding,
            position[0] + text_width + padding,
            position[1] + text_height + padding
        ]
        
        if customization.background == "solid":
            # Semi-transparent black background
            draw.rectangle(background_box, fill=(0, 0, 0, 180))
        elif customization.background == "gradient":
            # Create a gradient background (simplified for this example)
            draw.rectangle(background_box, fill=(0, 0, 0, 150))
    
    # Draw the text
    draw.text(position, wrapped_text, font=font, fill=customization.color)
    
    # Save the modified image
    img.save(output_path)

def wrap_text(text: str, font, max_width: float) -> str:
    """Wrap text to fit within a maximum width."""
    words = text.split()
    wrapped_lines = []
    current_line = []
    
    for word in words:
        # Add word to current line
        test_line = ' '.join(current_line + [word])
        # Check if it fits
        width = font.getlength(test_line)
        
        if width <= max_width:
            current_line.append(word)
        else:
            # Line is full, start a new one
            if current_line:
                wrapped_lines.append(' '.join(current_line))
                current_line = [word]
            else:
                # This handles the case where a single word is wider than max_width
                wrapped_lines.append(word)
                current_line = []
    
    # Add the last line if it's not empty
    if current_line:
        wrapped_lines.append(' '.join(current_line))
    
    return '\n'.join(wrapped_lines)

# Include the router in the main app
app.include_router(api_router)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
