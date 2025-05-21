
import requests
import sys
import time
import os
from datetime import datetime

class ContentGenerationAPITester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.story_id = None
        self.video_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, timeout=10):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=timeout)
            
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

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timed out after {timeout} seconds")
            return False, {"error": "timeout"}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_authentication(self):
        """Test authentication with the known password"""
        print("\n=== Testing Authentication ===")
        success, response = self.run_test(
            "Authentication with password '1234'",
            "POST",
            "auth",
            200,
            data={"password": "1234"}
        )
        return success

    def test_change_password(self):
        """Test changing password"""
        print("\n=== Testing Change Password ===")
        success, response = self.run_test(
            "Change password",
            "POST",
            "change-password",
            200,
            data={"old_password": "1234", "new_password": "5678"}
        )
        
        if success:
            # Test authentication with new password
            success2, _ = self.run_test(
                "Authentication with new password",
                "POST",
                "auth",
                200,
                data={"password": "5678"}
            )
            
            # Restore original password for subsequent tests
            if success2:
                success3, _ = self.run_test(
                    "Restore original password",
                    "POST",
                    "change-password",
                    200,
                    data={"old_password": "5678", "new_password": "1234"}
                )
                return success3
            return success2
        return success

    def test_settings(self):
        """Test saving API keys"""
        print("\n=== Testing Settings ===")
        
        # Test getting settings
        success, response = self.run_test(
            "Get settings",
            "GET",
            "settings",
            200
        )
        
        if success:
            print(f"Current settings: {response}")
            
            # Test saving settings
            settings = {
                "openai_api_key": "test_openai_key"
            }
            
            success2, response2 = self.run_test(
                "Save settings",
                "POST",
                "settings",
                200,
                data=settings
            )
            
            if success2:
                # Verify settings were saved correctly
                success3, response3 = self.run_test(
                    "Verify settings",
                    "GET",
                    "settings",
                    200
                )
                
                if success3:
                    if response3.get("openai_api_key") == settings["openai_api_key"]:
                        print("✅ Settings verification passed")
                        return True
                    else:
                        print("❌ Settings verification failed - values don't match")
                        return False
                return success3
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
            data={"prompt": "a story about a lost cat", "duration": "30-60"},
            timeout=30  # Increase timeout for story generation
        )
        
        if success and "id" in response:
            self.story_id = response["id"]
            print(f"✅ Story generated with ID: {self.story_id}")
            print(f"Story content: {response.get('content', 'No content available')}")
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
            data={"story_id": self.story_id, "style": "cartoon"},
            timeout=60  # Increase timeout for image generation
        )
        
        if success:
            if "image_urls" in response:
                print(f"✅ Images generated: {len(response['image_urls'])} images")
                print(f"Image URLs: {response['image_urls']}")
                return True
            elif "error" in response and response["error"] == "timeout":
                print("⚠️ Image generation request timed out")
                return False
        return False

    def test_videos(self):
        """Test getting videos"""
        print("\n=== Testing Videos API ===")
        
        success, response = self.run_test(
            "Get videos",
            "GET",
            "videos",
            200
        )
        
        if success:
            if isinstance(response, list):
                print(f"✅ Found {len(response)} videos")
                if len(response) > 0:
                    print(f"First video: {response[0]}")
                return True
            else:
                print(f"❌ Unexpected response format: {response}")
                return False
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
    
    # Test story generation
    story_success = tester.test_story_generation()
    
    # Test image generation
    if story_success:
        tester.test_image_generation()
    
    # Test videos API
    tester.test_videos()
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
