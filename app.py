from fastapi import FastAPI, File, UploadFile, Request, WebSocket ,WebSocketDisconnect
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from PIL import Image
import numpy as np
import io
import os
import time
from ultralytics import YOLO
import torch
import cv2  
import json


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
#app.mount("/predicted_frames_stream", StaticFiles(directory="predicted_frames_stream"), name="predicted_frames_stream")



@app.get("/video")
async def get_video():
    video_path = os.path.join(r"C:\Users\Legion\Desktop\drowsiness_detection_deployment\videos\yolo_omar_morning_web.mp4")  # Update with your video path
    return FileResponse(video_path)


# Set up Jinja2 templates directory
templates = Jinja2Templates(directory="templates")

# Create directories to store predicted images and videos
os.makedirs("predicted_images", exist_ok=True)
#os.makedirs("predicted_frames_stream", exist_ok=True)

# Serve static files from the "predicted_images" directory
@app.get("/predicted_images/{filename}", response_class=FileResponse)
async def get_image(filename: str):
    return FileResponse(f"predicted_images/{filename}")



# Homepage with form
@app.get("/", response_class=HTMLResponse)
async def get_form(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "predicted_image": None})

# WebSocket endpoint for video prediction
@app.websocket("/ws/video")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    try:
        while True:
            # Receive binary data from the client
            data = await websocket.receive_bytes()  # Receive binary image data
            
            # Convert bytes to NumPy array using OpenCV (faster than PIL)
            nparr = np.frombuffer(data, np.uint8)
            image_np = cv2.imdecode(nparr, cv2.IMREAD_COLOR)  # Decode the image
            
            # Get the prediction from the YOLO model
            results = model_yolo(image_np)
            
            # Convert the YOLO result back to image format
            annotated_image = results[0].plot()  # This method should return the annotated image as a NumPy array
            
            # Check detected boxes and get the predicted class
            predicted_classes = []
            for box in results[0].boxes:
                class_id = int(box.cls)  # Get the class ID for the box
                predicted_class = results[0].names[class_id]  # Map class ID to class name
                predicted_classes.append(predicted_class)

            # Check for drowsiness and prepare a message to send to the client
            is_drowsy = 'Drowse' in predicted_classes  # Check if 'Drowse' is detected

            # Encode image back to JPEG format
            _, encoded_image = cv2.imencode('.jpg', annotated_image)
            
            # Send the binary image (encoded) back to the client
            await websocket.send_bytes(encoded_image.tobytes())
            
            # Send the prediction result (drowsiness status) to the client
            await websocket.send_text(json.dumps({"isDrowsy": is_drowsy, "predictedClasses": predicted_classes}))
    
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        await websocket.send_text(f"Error: {str(e)}")




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
    
################# Streaming 


@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    cap = cv2.VideoCapture(0)  # Open the default camera

    if not cap.isOpened():
        await websocket.close()
        return

    try:
        while True:
            # Read a frame from the camera
            ret, frame = cap.read()
            if not ret:
                break

            # Run the YOLO model on the frame
            results = model_yolo(frame)
            annotated_frame = results[0].plot()  # Annotated frame

            # Check detected boxes and get the predicted classes
            predicted_classes = []
            for box in results[0].boxes:
                class_id = int(box.cls)  # Get the class ID for the box
                predicted_class = results[0].names[class_id]  # Map class ID to class name
                predicted_classes.append(predicted_class)

            # Check for drowsiness and prepare a message to send to the client
            is_drowsy = 'Drowse' in predicted_classes  # Check if 'Drowse' is detected

            # Encode the annotated frame to JPEG format
            _, buffer = cv2.imencode('.jpg', annotated_frame)
            frame_bytes = buffer.tobytes()

            # Send the frame bytes to the WebSocket
            await websocket.send_bytes(frame_bytes)

            # Send the prediction result (drowsiness status) to the client
            await websocket.send_text(json.dumps({"isDrowsy": is_drowsy, "predictedClasses": predicted_classes}))

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error: {str(e)}")
    finally:
        cap.release()  # Release the camera resource
        print("Camera released")


# Run the FastAPI application
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
