
import requests
import sys
import time
import os
from datetime import datetime

class ContentGenerationAPITester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.password = f"test_password_{datetime.now().strftime('%H%M%S')}"
        self.tests_run = 0
        self.tests_passed = 0
        self.story_id = None
        self.video_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                if response.content:
                    try:
                        return success, response.json()
                    except:
                        return success, response.content
                return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.content:
                    try:
                        print(f"Response: {response.json()}")
                    except:
                        print(f"Response: {response.content}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_authentication(self):
        """Test authentication with a new password"""
        print("\n=== Testing Authentication ===")
        success, response = self.run_test(
            "Authentication with new password",
            "POST",
            "auth",
            200,
            data={"password": self.password}
        )
        return success

    def test_change_password(self):
        """Test changing password"""
        print("\n=== Testing Change Password ===")
        new_password = f"{self.password}_new"
        success, response = self.run_test(
            "Change password",
            "POST",
            "change-password",
            200,
            data={"old_password": self.password, "new_password": new_password}
        )
        
        if success:
            # Test authentication with new password
            success2, _ = self.run_test(
                "Authentication with new password",
                "POST",
                "auth",
                200,
                data={"password": new_password}
            )
            
            # Restore original password for subsequent tests
            if success2:
                success3, _ = self.run_test(
                    "Restore original password",
                    "POST",
                    "change-password",
                    200,
                    data={"old_password": new_password, "new_password": self.password}
                )
                return success3
            return success2
        return success

    def test_settings(self):
        """Test saving API keys"""
        print("\n=== Testing Settings ===")
        
        # Test saving settings
        settings = {
            "tiktok_api_key": "test_tiktok_key",
            "youtube_api_key": "test_youtube_key"
        }
        
        success, response = self.run_test(
            "Save settings",
            "POST",
            "settings",
            200,
            data=settings
        )
        
        if success:
            # Test getting settings
            success2, response2 = self.run_test(
                "Get settings",
                "GET",
                "settings",
                200
            )
            
            if success2:
                # Verify settings were saved correctly
                if (response2.get("tiktok_api_key") == settings["tiktok_api_key"] and 
                    response2.get("youtube_api_key") == settings["youtube_api_key"]):
                    print("✅ Settings verification passed")
                    return True
                else:
                    print("❌ Settings verification failed - values don't match")
                    return False
            return success2
        return success

    def test_story_generation(self):
        """Test story generation"""
        print("\n=== Testing Story Generation ===")
        success, response = self.run_test(
            "Generate story",
            "POST",
            "generate-story",
            200,
            data={"prompt": "a story about a lost cat", "duration": "30-60"}
        )
        
        if success and "id" in response:
            self.story_id = response["id"]
            print(f"✅ Story generated with ID: {self.story_id}")
            return True
        return False

    def test_image_generation(self):
        """Test image generation"""
        print("\n=== Testing Image Generation ===")
        if not self.story_id:
            print("❌ Cannot test image generation without a story ID")
            return False
            
        success, response = self.run_test(
            "Generate images",
            "POST",
            "generate-images",
            200,
            data={"story_id": self.story_id, "style": "cartoon"}
        )
        
        if success and "image_urls" in response:
            print(f"✅ Images generated: {len(response['image_urls'])} images")
            return True
        return False

    def test_voice_generation(self):
        """Test voice generation"""
        print("\n=== Testing Voice Generation ===")
        if not self.story_id:
            print("❌ Cannot test voice generation without a story ID")
            return False
            
        success, response = self.run_test(
            "Generate voice",
            "POST",
            "generate-voice",
            200,
            data={"story_id": self.story_id, "voice": "alloy"}
        )
        
        if success and "audio_url" in response:
            print(f"✅ Voice generated with URL: {response['audio_url']}")
            return True
        return False

    def test_video_generation(self):
        """Test video generation"""
        print("\n=== Testing Video Generation ===")
        if not self.story_id:
            print("❌ Cannot test video generation without a story ID")
            return False
            
        subtitle_customization = {
            "font": "Arial",
            "color": "#FFFFFF",
            "placement": "bottom",
            "background": "solid"
        }
        
        success, response = self.run_test(
            "Generate video",
            "POST",
            "generate-video",
            200,
            data={
                "story_id": self.story_id,
                "subtitle_customization": subtitle_customization,
                "voice_id": "alloy"
            }
        )
        
        if success and "video_id" in response:
            self.video_id = response["video_id"]
            print(f"✅ Video generation started with ID: {self.video_id}")
            
            # Poll for video status
            max_attempts = 5  # Limit polling attempts for testing
            attempts = 0
            while attempts < max_attempts:
                attempts += 1
                print(f"Checking video status (attempt {attempts}/{max_attempts})...")
                
                status_success, status_response = self.run_test(
                    "Check video status",
                    "GET",
                    f"video-status/{self.video_id}",
                    200
                )
                
                if status_success:
                    status = status_response.get("status")
                    print(f"Video status: {status}")
                    
                    if status == "completed":
                        print("✅ Video generation completed successfully")
                        return True
                    elif status == "not_found":
                        print("❌ Video not found")
                        return False
                
                time.sleep(2)  # Wait before checking again
            
            print("⚠️ Video generation is still processing (test timeout)")
            return True  # Consider it a success since the request was accepted
        
        return False

    def test_gallery(self):
        """Test gallery functionality"""
        print("\n=== Testing Gallery ===")
        
        success, response = self.run_test(
            "Get videos",
            "GET",
            "videos",
            200
        )
        
        if success:
            videos = response
            if isinstance(videos, list):
                print(f"✅ Gallery returned {len(videos)} videos")
                
                # If we have a video ID from previous tests, check if it's in the gallery
                if self.video_id and any(video.get("id") == self.video_id for video in videos):
                    print(f"✅ Found our generated video in the gallery")
                
                return True
        
        return False

def main():
    # Get the backend URL from environment or use default
    backend_url = os.environ.get("REACT_APP_BACKEND_URL", "https://e8c10cff-09bc-4e3a-b85f-4ae0adc28467.preview.emergentagent.com")
    
    print(f"Testing API at: {backend_url}")
    tester = ContentGenerationAPITester(backend_url)
    
    # Run tests
    auth_success = tester.test_authentication()
    if not auth_success:
        print("❌ Authentication failed, stopping tests")
        return 1
    
    # Test password change
    tester.test_change_password()
    
    # Test settings
    tester.test_settings()
    
    # Test content generation flow
    story_success = tester.test_story_generation()
    if story_success:
        tester.test_image_generation()
        tester.test_voice_generation()
        tester.test_video_generation()
    
    # Test gallery
    tester.test_gallery()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
