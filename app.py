from fastapi import FastAPI, File, UploadFile, Request
from fastapi.responses import HTMLResponse, FileResponse, StreamingResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from PIL import Image
import numpy as np
import io
import os
import time
from pathlib import Path
from ultralytics import YOLO
import torch
import cv2  # Import OpenCV for video processing

# Load YOLO model (TensorRT)
model_path = r'C:\Users\Legion\Desktop\drowsiness_detection_deployment\models\yolo_final.engine'
device = 'cuda' if torch.cuda.is_available() else 'cpu'
model_yolo = YOLO(model_path)  # Load the model using TensorRT

# Create the FastAPI app
app = FastAPI()

# Serve static files (like CSS) from the "static" directory
app.mount("/static", StaticFiles(directory="C:/Users/Legion/Desktop/drowsiness_detection_deployment/static"), name="static")

# Serve static files from the "logo" directory
app.mount("/image", StaticFiles(directory="C:/Users/Legion/Desktop/drowsiness_detection_deployment/images"), name="logo")

# Define video path
video_path = Path("./videos/yolo_omar_morning_web.mp4")

@app.get("/video", summary="Serves video with Stream Response", tags=["Video serve"])
async def video_file_stream_response():
    def stream_file():
        with open(video_path, mode="rb") as file_bytes:
            yield from file_bytes  # Stream file directly
    return StreamingResponse(stream_file(), media_type="video/mp4")

# Set up Jinja2 templates directory
templates = Jinja2Templates(directory="templates")

# Create directories to store predicted images and videos
os.makedirs("predicted_images", exist_ok=True)
os.makedirs("predicted_videos", exist_ok=True)

# Serve static files from the "predicted_images" directory
@app.get("/predicted_images/{filename}", response_class=FileResponse)
async def get_image(filename: str):
    return FileResponse(f"predicted_images/{filename}")

# Serve static files from the "predicted_videos" directory
@app.get("/predicted_videos/{filename}", response_class=FileResponse)
async def get_video(filename: str):
    return FileResponse(f"predicted_videos/{filename}")

# Homepage with form
@app.get("/", response_class=HTMLResponse)
async def get_form(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "predicted_image": None})

# Endpoint to handle image uploads and make predictions using YOLO
@app.post("/predict/yolo/")
async def predict_yolo(file: UploadFile = File(...)):
    # Check if the uploaded file is an image
    if not file.content_type.startswith('image/'):
        return {"error": "Uploaded file is not a valid image."}

    try:
        # Load image
        image = Image.open(io.BytesIO(await file.read())).convert("RGB")
        
        # Convert the image to a NumPy array (YOLOv8 accepts this format)
        image_np = np.array(image)

        # Get the prediction from the YOLO model
        results = model_yolo(image_np)

        # Generate a unique filename using the current timestamp
        unique_filename = f"predicted_image_yolo_{int(time.time())}.jpg"
        
        # Save the annotated image
        predicted_image_path = f"predicted_images/{unique_filename}"
        
        # Save the annotated image directly
        results[0].save(predicted_image_path)  # Save the annotated image

        # Convert prediction to JSON-friendly format
        predictions = results[0].tojson()  # Convert the results to JSON format

        # Return predictions and image URL
        return {"predictions": predictions, "image_url": f"/predicted_images/{unique_filename}"}
    
    except Exception as e:
        return {"error": str(e)}



# Run the FastAPI application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
