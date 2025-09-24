// =======================================================
// GLOBAL HELPER FUNCTION
// =======================================================
/**
 * Displays a message on the status element.
 * @param {string} message The message to display.
 * @param {boolean} isError If true, the message will be styled as an error.
 */
function showMessage(message, isError = false) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = isError 
            ? 'text-center text-red-400 h-6' 
            : 'text-center text-green-400 h-6';
    }
}

// =======================================================
// INITIALIZATION
// =======================================================
document.addEventListener('DOMContentLoaded', () => {
    // --- LOGIN PAGE LOGIC ---
    const videoLogin = document.getElementById('video');
    const loginButton = document.getElementById('loginButton');
    if (videoLogin && loginButton) {
        setupLoginPage(videoLogin, loginButton);
    }
    
    // --- REGISTRATION PAGE LOGIC ---
    const videoRegister = document.getElementById('video');
    const overlay = document.getElementById('overlay');
    const captureButton = document.getElementById('captureButton');
    const registerForm = document.getElementById('registerForm');
    if (videoRegister && overlay && captureButton) {
        setupRegistrationPage(videoRegister, overlay, captureButton, registerForm);
    }
});

// =======================================================
// LOGIN PAGE SETUP
// =======================================================
function setupLoginPage(video, button) {
    const form = document.getElementById('loginForm');
    const overlay = document.getElementById('overlay');
    let isFaceDetected = false;

    // --- LOAD MODELS for browser-side detection ---
    async function loadModels() {
        showMessage("Loading models...", false);
        try {
            await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
            showMessage("", false);
            startVideo();
        } catch (error) {
            showMessage("Failed to load models.", true);
            console.error(error);
        }
    }
    loadModels();

    // --- START VIDEO and detection loop ---
    async function startVideo() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            video.srcObject = stream;
        } catch (err) {
            showMessage("Could not access webcam.", true);
        }
    }

    video.addEventListener('play', () => {
        const videoContainer = document.getElementById('videoContainer');
        const aspectRatio = video.videoWidth / video.videoHeight;
        if (videoContainer) videoContainer.style.aspectRatio = aspectRatio;

        const displaySize = { width: video.clientWidth, height: video.clientHeight };
        faceapi.matchDimensions(overlay, displaySize);

        const context = overlay.getContext('2d');
        setInterval(async () => {
            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
            const resizedDetections = faceapi.resizeResults(detections, displaySize);

            context.clearRect(0, 0, overlay.width, overlay.height);
            context.drawImage(video, 0, 0, overlay.width, overlay.height);

            if (resizedDetections && resizedDetections.length > 0) {
                isFaceDetected = true;
                document.getElementById('instruction').textContent = "Face detected. Ready to login.";
                const box = resizedDetections[0].box;
                context.strokeStyle = 'lime';
                context.lineWidth = 3;
                context.strokeRect(box.x, box.y, box.width, box.height);
            } else {
                isFaceDetected = false;
                document.getElementById('instruction').textContent = "Position your face in the frame";
            }
        }, 100);
    });

    // --- FORM SUBMIT LOGIC ---
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!isFaceDetected) {
            showMessage("No face detected. Please position your face in the frame.", true);
            return;
        }
        
        button.disabled = true;
        showMessage("Verifying...", false);
        
        overlay.toBlob(async (blob) => {
            const formData = new FormData(form);
            formData.append('image', blob, 'login_face.jpg');

            try {
                const response = await fetch('/api/auth/login', { method: 'POST', body: formData });
                const result = await response.json();
                if (response.ok) {
                    localStorage.setItem('token', result.token);
                    localStorage.setItem('username', result.user);
                    showMessage(result.message, false);
                    setTimeout(() => window.location.href = '/dashboard.html', 1500);
                } else {
                    showMessage(result.message || "Login failed.", true);
                }
            } catch (error) {
                showMessage("Login request failed.", true);
            } finally {
                button.disabled = false;
            }
        }, 'image/jpeg');
    });
}


// =======================================================
// REGISTRATION PAGE SETUP
// =======================================================
async function setupRegistrationPage(video, overlay, button, form) {
    let capturedImages = [];
    let isFaceDetected = false;
    const TOTAL_CAPTURES = 5;
    let faceDetectionInterval = null;

    // --- LOAD MODELS ---
    showMessage("Loading models, please wait...", false);
    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    ]).then(startVideo);
    
    // --- START VIDEO ---
    async function startVideo() {
        showMessage("", false);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
            video.srcObject = stream;
        } catch (err) {
            showMessage("Could not access webcam.", true);
        }
    }

    // --- CORE LOGIC WHEN VIDEO PLAYS ---
    video.addEventListener('play', () => {
        // --- START: ASPECT RATIO FIX ---
        const videoContainer = document.getElementById('videoContainer');
        // Get the intrinsic aspect ratio from the video stream itself
        const aspectRatio = video.videoWidth / video.videoHeight;
        // Set the container's aspect ratio to match the video's, preventing distortion
        if (videoContainer) {
            videoContainer.style.aspectRatio = aspectRatio;
        }
        // --- END: ASPECT RATIO FIX ---

        const displaySize = { width: video.clientWidth, height: video.clientHeight };
        faceapi.matchDimensions(overlay, displaySize);

        startFaceDetectionLoop(overlay, displaySize);
    });
    
    // --- DRAWING LOOP FUNCTION ---
    function startFaceDetectionLoop(canvas, displaySize) {
        const context = canvas.getContext('2d');
        faceDetectionInterval = setInterval(async () => {
            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
            const resizedDetections = faceapi.resizeResults(detections, displaySize);

            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            if (resizedDetections && resizedDetections.length > 0) {
                isFaceDetected = true;
                document.getElementById('instruction').textContent = "Face detected! Click capture.";
                resizedDetections.forEach(detection => {
                    const box = detection.box;
                    context.strokeStyle = 'lime';
                    context.lineWidth = 3;
                    context.strokeRect(box.x, box.y, box.width, box.height);
                });
            } else {
                isFaceDetected = false;
                document.getElementById('instruction').textContent = "Position your face in the frame";
            }
        }, 100);
    }

    // --- CAPTURE LOGIC ---
    button.addEventListener('click', () => {
        if (capturedImages.length >= TOTAL_CAPTURES) {
            submitRegistration();
            return;
        }
        if (!isFaceDetected) {
            showMessage("No face detected. Please try again.", true);
            return;
        }
        overlay.toBlob(blob => {
            capturedImages.push(blob);
            showMessage(`Image ${capturedImages.length}/${TOTAL_CAPTURES} captured!`, false);
            button.textContent = `Capture (${capturedImages.length}/${TOTAL_CAPTURES})`;
            if (capturedImages.length === TOTAL_CAPTURES) {
                button.textContent = "Register Account";
                button.classList.remove('bg-cyan-600', 'hover:bg-cyan-700');
                button.classList.add('bg-green-600', 'hover:bg-green-700');
                document.getElementById('instruction').textContent = "All images captured. Click Register!";
            }
        }, 'image/jpeg');
    });

    // --- SUBMIT LOGIC ---
    async function submitRegistration() {
        button.disabled = true;
        showMessage("Processing registration...", false);
        const formData = new FormData(form);
        capturedImages.forEach((blob, index) => {
            formData.append('images', blob, `capture_${index}.jpg`);
        });
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (response.ok) {
                showMessage(result.message, false);
                setTimeout(() => window.location.href = '/', 2000);
            } else {
                showMessage(result.message, true);
            }
        } catch (error) {
            showMessage("Registration request failed.", true);
        } finally {
            button.disabled = false;
        }
    }
}