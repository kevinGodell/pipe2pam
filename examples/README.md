# pipe2pam
Parse individual pam images from an ffmpeg pipe when the output video codec (*-c:v*) is set to **pam** and the format (*-f*) is set to **image2pipe**. The supported pixel formats (*-pix_fmt*) are **rgb24**, **rgba**, **gray**, and **monob**. Pam is an image type similar to ppm, pbm, and pgm. It has a small header that is followed by an uncompressed array of pixel data. This can be used as an alternate way to get pixel data instead of generating jpegs and using canvas.

The following [example](https://github.com/kevinGodell/pipe2pam/blob/master/examples/example.js) uses ffmpeg's **testsrc** to simulate a video input and generates 1000 downscaled grayscale pam images at a rate of 2 per second. The pam images are piped in from ffmpeg's stdout and output a pam image object. Pipe2Pam dispatches a "pam" event, which contains a pam image object. The object contains the entire pam image, plus additional data such as width, height, depth, maxval, tupltype, and an array of pixels. It can also pipe the object to a pipe reader for further use, such as pixel comparison between 2 pam images:


### installing and running the example:
```
git clone https://github.com/kevinGodell/pipe2pam.git

cd pipe2pam

npm install

node examples/example.js

```