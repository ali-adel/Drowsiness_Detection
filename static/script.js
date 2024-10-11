const canvasStream = document.getElementById("cameraStream");
const contextStream = canvasStream.getContext("2d");
const streamButton = document.getElementById("cameraStreamButton");
const loadingSpinnerStream = document.querySelector(".loader");
const connectionMessageStream = document.getElementById("connectionMessageCamera");

let videoStreamStream;
let isStreamingStream = false;

// Drowsiness detection logic variables
let drowsinessTimeoutStream = null;
const DROWSY_ACTIVATION_TIME_STREAM = 3000; // Time after which a warning is shown
const BRAKE_ACTIVATION_TIME_STREAM = 6000; // Time after which brakes are activated
let isCurrentlyDrowsyStream = false;
let drowsinessStartTimeStream = null;
let warningMessageShownStream = false;
let brakesMessageShownStream = false;
let warningIntervalStream = null;
let countdownIntervalStream = null;
const countdownDurationStream = 3; // 3 seconds countdown

// Add a variable for the brake sound interval
let brakeSoundIntervalStream = null;

// Start/Stop stream button
streamButton.onclick = function () {
    if (!isStreamingStream) {
        startVideoStream();
    } else {
        stopVideoStream();
    }
};

// Start the video stream
function startVideoStream() {
    loadingSpinnerStream.style.display = "block";
    connectionMessageStream.style.display = "block";

    videoStreamStream = new WebSocket("ws://localhost:8000/ws/stream");

    videoStreamStream.onopen = function () {
        loadingSpinnerStream.style.display = "none";
        connectionMessageStream.style.display = "none";
        isStreamingStream = true;
        streamButton.querySelector('.text').textContent = "Stop Stream";
    };

    videoStreamStream.onmessage = function (event) {
        const blob = new Blob([event.data], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);

        const img = new Image();
        img.src = url; // Set image source
        img.onload = function () {
            contextStream.drawImage(img, 0, 0, canvasStream.width, canvasStream.height); // Draw image on canvas
            URL.revokeObjectURL(url); // Release memory
        };

        handleDrowsinessDetectionStream(event.data); // Handle drowsiness detection
    };

    videoStreamStream.onerror = function (error) {
        console.error("WebSocket error:", error);
        loadingSpinnerStream.style.display = "none";
        connectionMessageStream.style.display = "none";
    };

    videoStreamStream.onclose = function () {
        console.log("WebSocket connection closed");
        isStreamingStream = false;
        streamButton.querySelector('.text').textContent = "Start Stream";
        loadingSpinnerStream.style.display = "none";
        connectionMessageStream.style.display = "none";
    };
}

// Stop the video stream
function stopVideoStream() {
    if (videoStreamStream) {
        videoStreamStream.close();
    }
}

// Handle drowsiness detection messages
function handleDrowsinessDetectionStream(data) {
    const message = JSON.parse(data); // Assuming the server sends JSON
    const isDrowsyStream = message.isDrowsy; // Boolean indicating if drowsiness was detected

    // Drowsiness handling logic
    if (isDrowsyStream) {
        if (!isCurrentlyDrowsyStream) {
            drowsinessStartTimeStream = Date.now(); // Start timing for drowsiness
            isCurrentlyDrowsyStream = true;
            warningMessageShownStream = false; // Reset warning message flag
            brakesMessageShownStream = false; // Reset brakes message flag
        }

        const drowsinessDurationStream = Date.now() - drowsinessStartTimeStream;

        if (drowsinessDurationStream >= DROWSY_ACTIVATION_TIME_STREAM && !warningMessageShownStream) {
            showWarningStream(); // Show the warning message
            warningMessageShownStream = true; // Mark that warning is shown
        }

        // If driver remains drowsy for 6 seconds, activate brakes
        if (drowsinessDurationStream >= BRAKE_ACTIVATION_TIME_STREAM && !brakesMessageShownStream) {
            showBrakeWarningStream(); // Show the brakes activation message
            brakesMessageShownStream = true; // Mark that brakes message is shown
        }
    } else {
        if (isCurrentlyDrowsyStream) {
            hideWarningStream(); // Hide the warning
            hideBrakeWarningStream(); // Hide the brakes message
            resetDrowsinessStateStream(); // Reset drowsiness state
        }
    }
}

// Function to display the warning
function showWarningStream() {
    const warningElementStream = document.getElementById('warningCamera'); // Updated ID
    const warningSoundStream = document.getElementById('warningSoundCamera'); // Reference to warning sound

    warningElementStream.style.display = 'block'; // Show warning message
    warningSoundStream.play(); // Play the warning sound

    // Optional: Repeat the sound at intervals
    if (!warningIntervalStream) {
        warningIntervalStream = setInterval(() => {
            warningSoundStream.currentTime = 0; // Reset sound to the start
            warningSoundStream.play(); // Play sound again
        }, 1000); // Play sound every second
    }
}

// Function to display brakes activation warning with countdown
function showBrakeWarningStream() {
    const brakeWarningElementStream = document.getElementById('brakeWarningCamera'); // Updated ID
    const countdownElementStream = document.getElementById('countdownCamera'); // Updated countdown element ID
    brakeWarningElementStream.style.display = 'block'; // Show brakes message

    let countdown = countdownDurationStream; // Start countdown from 3 seconds
    countdownElementStream.textContent = `Brakes Opened! Car will stop in ${countdown} seconds`; // Set initial message

    // Countdown logic
    countdownIntervalStream = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            countdownElementStream.textContent = `Brakes Opened! Car will stop in ${countdown} seconds`; // Update message
        } else {
            clearInterval(countdownIntervalStream); // Stop countdown
            countdownElementStream.textContent = `Car has stopped`; // Change message after countdown
            // Optionally, you can hide the brake warning after a delay if needed
            setTimeout(hideBrakeWarningStream, 3000); // Hide the brake warning after 3 seconds
        }
    }, 1000); // Update every second

    // Repeat the brake warning message at intervals
    if (!brakeSoundInterval) {
        brakeSoundInterval = setInterval(() => {
            const brakeSound = document.getElementById('brakeSoundCamera');
            brakeSound.currentTime = 0; // Reset sound to the start
            brakeSound.play(); // Play brake sound
        }, 1000); // Play sound every second (adjust as needed)
    }
}

// Function to hide the brake warning
function hideBrakeWarningStream() {
    const brakeWarningElementStream = document.getElementById('brakeWarningCamera'); // Updated ID
    brakeWarningElementStream.style.display = 'none'; // Hide brakes message
    clearInterval(countdownIntervalStream); // Clear countdown interval

    // Stop the repeated brake sound
    if (brakeSoundInterval) {
        clearInterval(brakeSoundInterval);
        brakeSoundInterval = null; // Clear the interval
    }

    const brakeSound = document.getElementById('brakeSoundCamera');
    brakeSound.pause(); // Stop the sound
    brakeSound.currentTime = 0; // Reset sound position
}

// Function to hide the warning
function hideWarningStream() {
    const warningElementStream = document.getElementById('warningCamera'); // Updated ID
    warningElementStream.style.display = 'none'; // Hide warning message

    if (warningIntervalStream) {
        clearInterval(warningIntervalStream); // Clear the interval to stop the sound
        warningIntervalStream = null; // Reset the interval variable
    }
}


// Function to reset drowsiness state when the driver becomes active
function resetDrowsinessStateStream() {
    isCurrentlyDrowsyStream = false; // Reset drowsiness flag
    drowsinessStartTimeStream = null; // Clear the start time
    warningMessageShownStream = false; // Reset warning message shown flag
    brakesMessageShownStream = false; // Reset brakes message shown flag
    hideBrakeWarningStream(); // Ensure brakes message is hidden
}

function toggleBrakeIconCamera(show) {
    const brakeIcon = document.getElementById("brakeIconCamera");
    if (show) {
        brakeIcon.classList.remove("hidden");  // Show the icon by removing 'hidden' class
    } else {
        brakeIcon.classList.add("hidden");     // Hide the icon by adding 'hidden' class
    }
}

// Show the brake icon automatically after a certain delay (e.g., 2 seconds)
// Function to toggle the visibility of the brake icon
function toggleBrakeIconCamera() {
    const brakeIcon = document.getElementById("brakeIconCamera");
    brakeIcon.classList.toggle("hidden"); // Toggle the hidden class
}

// Set interval to toggle the brake icon every 2 seconds
setInterval(toggleBrakeIconCamera, 177); // Adjust the time as needed (2000ms = 2 seconds)

////////////////////////////////////////// Image  Section ///////////////////////////////////////////////////// 

        document.getElementById("imagetButton").onclick = async () => {
            const fileInput = document.getElementById("imageInput");
            const file = fileInput.files[0];

            if (!file) {
                alert("Please select an image before making a prediction.");
                return;
            }

            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/predict/yolo/", {
                method: "POST",
                body: formData
            });

            const result = await response.json();
            const resultDiv = document.getElementById("result");

            if (result.error) {
                resultDiv.textContent = `Error: ${result.error}`;
            } else {
                const imgElement = document.createElement("img");
                imgElement.src = result.image_url;
                resultDiv.innerHTML = ""; // Clear previous result
                resultDiv.appendChild(imgElement);
            }
        };


////////////////////////////////////////// Video Section ///////////////////////////////////////////////////// 

const ws = new WebSocket('ws://localhost:8000/ws/video'); 

ws.onopen = () => {
    console.log('WebSocket connection established');
};

// Variables for handling drowsiness logic and countdown
let countdownTimeout = null; // Timeout for counting down the car stop
let countdownTime = 3; // Countdown duration for car stop

let drowsinessTimeout = null;
const DROWSY_ACTIVATION_TIME = 3000; // Time after which a warning is shown
const BRAKE_ACTIVATION_TIME = 6000; // Time after which brakes are activated
let isCurrentlyDrowsy = false;
let drowsinessStartTime = null;
let warningMessageShown = false;
let brakesMessageShown = false;
let warningInterval = null;


ws.onmessage = (event) => {
    if (event.data instanceof Blob) {
        // Display image as usual
        const predictedBlob = event.data;

        let imgElement = document.getElementById('predictedImage');
        if (!imgElement) {
            imgElement = document.createElement('img');
            imgElement.id = 'predictedImage';
            imgElement.width = 740;
            imgElement.height = 480;
            document.getElementById('vid_result').appendChild(imgElement);
        }

        const url = URL.createObjectURL(predictedBlob);
        imgElement.src = url;

    } else if (typeof event.data === 'string') {
        // Handle text messages (like drowsiness detection)
        const message = JSON.parse(event.data);
        console.log('Predicted classes:', message.predictedClasses);
        console.log('Drowsiness status:', message.isDrowsy); // Log drowsiness status

        const isDrowsy = message.isDrowsy; // Boolean indicating if drowsiness was detected

        // Drowsiness handling logic
        if (isDrowsy) {
            if (!isCurrentlyDrowsy) {
                drowsinessStartTime = Date.now(); // Start timing for drowsiness
                isCurrentlyDrowsy = true;
                warningMessageShown = false; // Reset warning message flag
                brakesMessageShown = false; // Reset brakes message flag
            }

            const drowsinessDuration = Date.now() - drowsinessStartTime;

            if (drowsinessDuration >= DROWSY_ACTIVATION_TIME && !warningMessageShown) {
                showWarning(); // Show the warning message
                warningMessageShown = true; // Mark that warning is shown
            }

            // If driver remains drowsy for 6 seconds, activate brakes
            if (drowsinessDuration >= BRAKE_ACTIVATION_TIME && !brakesMessageShown) {
                showBrakeWarning(); // Show the brakes activation message
                startCountdown(); // Start the countdown for stopping the car
                brakesMessageShown = true; // Mark that brakes message is shown
            }
        } else {
            if (isCurrentlyDrowsy) {
                hideWarning(); // Hide the warning
                hideBrakeWarning(); // Hide the brakes message
                resetCountdown(); // Reset countdown and states
            }
        }
    }
};

// Function to display the warning
function showWarning() {
    const warningElement = document.getElementById('warning');
    const warningSound = document.getElementById('warningSound');

    warningElement.style.display = 'block';
    warningSound.play();

    if (!warningInterval) {
        warningInterval = setInterval(() => {
            warningSound.currentTime = 0;
            warningSound.play();
        }, 1000); // Play sound every second
    }
}


// Function to start countdown when the brakes are activated
function startCountdown() {
    const countdownElement = document.getElementById('countdown');
    countdownTime = 3; // Set countdown to 3 seconds

    countdownElement.style.display = 'block'; // Show countdown display
    countdownElement.innerText = `Brakes activated! Car will stop in ${countdownTime} seconds.`; // Initial message

    // Countdown logic
    countdownTimeout = setInterval(() => {
        countdownTime -= 1; // Decrease countdown time

        if (countdownTime > 0) {
            countdownElement.innerText = `Brakes activated! Car will stop in ${countdownTime} seconds.`; // Update message
        } else {
            countdownElement.innerText = 'Car has stopped.'; // Final message when countdown reaches 0
            clearInterval(countdownTimeout); // Stop the countdown
        }
    }, 1000); // Update every second
}

// Function to hide the warning
function hideWarning() {
    const warningElement = document.getElementById('warning');
    warningElement.style.display = 'none';

    if (warningInterval) {
        clearInterval(warningInterval);
        warningInterval = null;
    }
}



// Function to reset countdown and states when the driver becomes natural again
function resetCountdown() {
    const countdownElement = document.getElementById('countdown');
    countdownElement.style.display = 'none'; // Hide countdown display

    if (countdownTimeout) {
        clearInterval(countdownTimeout); // Clear countdown if still active
        countdownTimeout = null;
    }

    isCurrentlyDrowsy = false; // Reset drowsiness state
    drowsinessStartTime = null; // Reset the drowsiness start time
    warningMessageShown = false; // Reset warning message flag
    brakesMessageShown = false; // Reset brakes message flag
}

// Event listener for form submission (video input)
document.getElementById('videoForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const videoButton = document.getElementById('videoButton');
    const videoInput = document.getElementById('videoInput');
    const file = videoInput.files[0];

    if (file) {
        // Disable the button after submission
        videoButton.disabled = true;
        videoButton.textContent = "Processing..."; // Optional: change button text

        const videoURL = URL.createObjectURL(file);
        const videoElement = document.createElement('video');
        videoElement.src = videoURL;
        videoElement.play();

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        videoElement.onloadedmetadata = () => {
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
        };

        const intervalId = setInterval(() => {
            context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

            canvas.toBlob(blob => {
                if (blob) {
                    ws.send(blob); // Send frames to the server via WebSocket
                }
            }, 'image/jpeg');
        }, 100);

        videoElement.onended = () => {
            clearInterval(intervalId);
            canvas.remove();
            // Reset the video element to allow new video selection
            videoElement.src = '';
            videoButton.disabled = false;
            videoButton.textContent = "Detect Drowsiness"; // Restore button text
        };

        // Handle video element being stopped so that it can be played again
        videoElement.addEventListener('ended', () => {
            clearInterval(intervalId);
            canvas.remove();
            videoButton.disabled = false; // Re-enable button
            videoButton.textContent = "Detect Drowsiness"; // Restore button text
        });
    }
});
// Function to toggle the visibility of the brake icon using the hidden class
function toggleBrakeIcon(show) {
    const brakeIcon = document.getElementById("brakeIcon");
    if (show) {
        brakeIcon.classList.remove("hidden");  // Show the icon by removing 'hidden' class
    } else {
        brakeIcon.classList.add("hidden");     // Hide the icon by adding 'hidden' class
    }
}

// Show the brake icon automatically after a certain delay (e.g., 2 seconds)
// Function to toggle the visibility of the brake icon
function toggleBrakeIcon() {
    const brakeIcon = document.getElementById("brakeIcon");
    brakeIcon.classList.toggle("hidden"); // Toggle the hidden class
}

// Set interval to toggle the brake icon every 2 seconds
setInterval(toggleBrakeIcon, 177); // Adjust the time as needed (2000ms = 2 seconds)


function showBrakeWarning() {
    const brakeWarningElement = document.getElementById('brakeWarning');
    brakeWarningElement.style.display = 'block'; // Show brakes message

    // Play brake sound
    const brakeSound = document.getElementById('brakeSound');
    brakeSound.play();

    // Start repeating the brake sound
    if (!brakeSoundInterval) {
        brakeSoundInterval = setInterval(() => {
            brakeSound.currentTime = 0; // Reset sound position
            brakeSound.play(); // Play the sound
        }, 1000); // Repeat every second
    }
}

// Function to hide the brake warning
function hideBrakeWarning() {
    const brakeWarningElement = document.getElementById('brakeWarning');
    brakeWarningElement.style.display = 'none';
    
    // Stop repeating the brake sound
    if (brakeSoundInterval) {
        clearInterval(brakeSoundInterval);
        brakeSoundInterval = null; // Clear the interval
    }

    const brakeSound = document.getElementById('brakeSound');
    brakeSound.pause(); // Stop the sound
    brakeSound.currentTime = 0; // Reset sound position
}

// Add a variable for the brake sound interval
let brakeSoundInterval = null;