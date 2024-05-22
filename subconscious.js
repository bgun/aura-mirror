let webcamCapture; // Variable to store the webcam capture
let videoCapture;  // variable to store the video download file
let facemesh; // Variable to store the ML5.js FaceMesh model
let faces = []; // Array to store detected faces
let frameImage;
let ratioW, ratioH;
let predictions = [];
let facebox;
let faceshim = 10;
let recording = false;

function preload() {
  facemesh = ml5.facemesh(); // Load the ML5.js FaceMesh model
  frameImage = loadImage('assets/blur-circle.png');
}

console.log(awsCreds);
// Configure the AWS SDK with your region
AWS.config.update({
  accessKeyId:     awsCreds.aws_access_key_id,
  secretAccessKey: awsCreds.aws_secret_access_key,
  region:          awsCreds.region
});

// Create an S3 client instance
const s3 = new AWS.S3();

// Function to upload a blob to S3
function uploadBlobToS3(bucketName, key, blob) {
    // Parameters for the S3 upload
    const params = {
        Bucket: bucketName,
        Key: key,
        Body: blob,
        ContentType: blob.type // Set the content type if known
    };

    // Upload the blob to S3
    s3.upload(params, function(err, data) {
        if (err) {
            console.error('Error uploading blob:', err);
        } else {
            console.log('Blob uploaded successfully:', data.Location);
        }
    });
}


P5Capture.setDefaultOptions({
  format: "webm",
  framerate: 10,
  quality: 0.5,
  width: 320,
  disableUi: true,
  beforeDownload(blob, context, next) {
    // call your own code to do before file download.
    console.log(blob.size, context);

    // calling `next` callback will start the file download.
    // this can be omitted if not needed.

    // Upload blob to S3
    const bucketName = 'bgun-sandbox';
    const key = context.filename; // 'path/to/your/blob';

    uploadBlobToS3(bucketName, key, blob);
  },
});

// Setup function runs once at the beginning
function setup() {

  // Pressing Spacebar starts and stops recording
  document.addEventListener("keypress", function onEvent(event) {
    if (event.key === " ") {
      recording = !recording;
    }
  });

  // Create a canvas the size of the window
  createCanvas(windowWidth, windowHeight);
  console.log("Window", windowWidth, windowHeight);

  // Create a video capture object
  webcamCapture = createCapture(VIDEO);
  //video.size(windowWidth, windowHeight);

  // Set the size of the video capture to match the canvas size
  webcamCapture.size(640,480);
  // Hide the video element
  webcamCapture.hide();

  facemesh.detectStart(webcamCapture, gotFaces); // Start face detection on the video feed
}

function draw() {
  // Mirror the display
  translate(width,0);
  scale(-1,1);

  image(webcamCapture, 0, 0, windowWidth, windowHeight);

  if (recording && !videoCapture) {
    console.log("Recording started.");
    videoCapture = P5Capture.getInstance();
    videoCapture.start();
  }
  if (!recording && videoCapture) {
    console.log("Recording stopped.");
    videoCapture.stop();
    videoCapture = null;
  }

  /*
  // Show all keypoints as dots
  ratioW = windowWidth / webcamCapture.width;
  ratioH = windowHeight / webcamCapture.height;

  if(predictions) {
    for (let i = 0; i < predictions.length; i += 1) {
      if(predictions[i]) {
        let x = predictions[i].x * ratioW;
        let y = predictions[i].y * ratioH;
        fill(255, 255, 255);
        ellipse(x, y, 5, 5);
      }
    }
  }
  */

  /*
  const capture = P5Capture.getInstance();
  capture.start({
    format: "gif",
    duration: 100,
  });
  */

  // use ml5 to pick out only the face and expand to fill the window
  if(facebox) {
    image(webcamCapture, 0, 0, windowWidth, windowHeight, facebox.xMin-(faceshim), facebox.yMin-(faceshim), facebox.width+(faceshim*2), facebox.height+(faceshim*2));
  }

  // playing with filters
  filter(INVERT);
  filter(BLUR, 5);
  filter(POSTERIZE, 7);

  // add frame and words
  image(frameImage,0,0,windowWidth, windowHeight);
}

// Callback function to handle face detection results
function gotFaces(results) {
  faces = results; // Store the detected faces in the faces array
  if(results && results[0]) {
    predictions = results[0].keypoints;
    facebox = results[0].box;
  }
}