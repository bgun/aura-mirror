let webcamCapture; // Variable to store the webcam capture
let videoCapture;  // variable to store the video download file
let faceCapture;
let facemesh; // Variable to store the ML5.js FaceMesh model
let faces = []; // Array to store detected faces
let frameImage, overlayImage;
let ratioW, ratioH;
let predictions = [];
let facebox;
let faceshim = 100;
let recording = false;
let camShader;

let numLayers = 30;
let layers = [];
let index1 = 0;
let index2 = numLayers/3; // 30
let index3 = numLayers/3 * 2; // 60

function preload() {
  facemesh = ml5.facemesh(); // Load the ML5.js FaceMesh model
  frameImage = loadImage('assets/blur-circle.png');
  overlayImage = loadImage('assets/overlay.png');

  camShader = loadShader(
    './effect.vert',
    './effect.frag'
  );
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
  noStroke();
  shaderLayer = createGraphics(windowWidth, windowHeight, WEBGL);

  for (let i = 0; i < numLayers; i++){
    let l = createGraphics(windowWidth, windowHeight);
    layers.push(l);
  }

  // Create a video capture object. By default captures both
  // audio and video; pass VIDEO or AUDIO for just one or the other.
  webcamCapture = createCapture();

  // Set the size of the video capture to match the canvas size
  webcamCapture.size(640,480);
  webcamCapture.hide();

  facemesh.detectStart(webcamCapture, gotFaces); // Start face detection on the video feed
}

function draw() {
  // Mirror the display
  /*
  translate(width,0);
  scale(-1,1);
  */

  //image(webcamCapture, 0, 0, windowWidth, windowHeight);

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

  // Show all keypoints as dots
  /*
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

  // Mirror the display
  //scale(-1,1);

  /*
  texture(webcamCapture);
  rect(-windowWidth/2,-windowHeight/2,windowWidth,windowHeight);
  */
  // draw the camera on the current layer

  // use ml5 to pick out only the face and expand to fill the window
  if(facebox) {
    faceCapture = createGraphics(windowWidth, windowHeight);
    faceCapture.image(webcamCapture, 0, 0, windowWidth, windowHeight, facebox.xMin-(faceshim), facebox.yMin-(faceshim), facebox.width+(faceshim*2), facebox.height+(faceshim*2));
  } else {
    faceCapture = createGraphics(windowWidth, windowHeight);
  }

  layers[index1].image(faceCapture, 0, 0, width, height);

  shaderLayer.shader(camShader);
  camShader.setUniform('tex0', layers[index1]);
  camShader.setUniform('tex1', layers[index2]);
  camShader.setUniform('tex2', layers[index3]);
  // rect gives us some geometry on the screen
  shaderLayer.rect(0,0,width, height);

  // render the shaderlayer to the screen
  image(shaderLayer, 0,0, width, height);

  // increase all indices by 1, resetting if it goes over layers.length
  // the index runs in a circle 0, 1, 2, ... 29, 30, 0, 1, 2, etc.
  // index1
  // index2 will be somewhere in the past
  // index3 will be even further into the past
  index1 = (index1 + 1)  % layers.length;
  index2 = (index2 + 1) % layers.length;
  index3 = (index3 + 1) % layers.length;


  // add frame and words
  image(frameImage,0,0,windowWidth, windowHeight);

  //filter(INVERT);

  /*
  push();
  imageMode(CENTER);
  translate(windowWidth/2, windowHeight/2);
  rotate(millis() / 10000 * PI / 2);
  image(overlayImage,0,0,windowWidth+300, windowHeight+300);
  pop();
  */
}

// Callback function to handle face detection results
function gotFaces(results) {
  faces = results; // Store the detected faces in the faces array
  if(results && results[0]) {
    predictions = results[0].keypoints;
    facebox = results[0].box;
  }
}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
}