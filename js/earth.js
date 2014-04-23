var canvas;
var gl;

var mvMatrix;
var shaderProgram;
var vertexPositionAttribute;
var textureCoordAttribute;
var vertexNormalAttribute;

var perspectiveMatrix;
var mvMatrixStack = [];

var cubeRotation = 0.0;
var lastCubeUpdateTime = 0;

var mouseDown = false;
var lastMouseX = null;
var lastMouseY = null;
var moonRotationMatrix = Matrix.I(4);

var z = -5.0;
var currentPressedKeys = {};





var moonVertexPositionBuffer;
var moonVertexNormalBuffer;
var moonVertexTextureCoordBuffer;
var moonVertexIndexBuffer;
var moonTexture;
var moonImage;



var earthVertexBuffer;
var earthNormalBuffer;
var earthTexCoordBuffer;
var textureList = [];


function start() {
    canvas = document.getElementById("glcanvas");

    initWebGL(canvas);      // Initialize the GL context

    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;

    if (gl) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
        gl.clearDepth(1.0);                 // Clear everything
        gl.enable(gl.DEPTH_TEST);           // Enable depth testing
        gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

        gl.enable(gl.CULL_FACE);

        initShaders();

        initBuffers();

        initTextures();

        canvas.onmousedown = handleMouseDown;
        document.onmouseup = handleMouseUp;
        document.onmousemove = handleMouseMove;

        document.onkeydown = handleKeyDown;
        document.onkeyup = handleKeyUp;


        setInterval(tick, 15);
    }
}

function tick(){
    drawScene();
    handleKeys();
}

function handleMouseDown(event){
    console.log('mouseDown');

    mouseDown = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
}


function initWebGL() {
    gl = null;

    try {
        gl = canvas.getContext("experimental-webgl");
    }
    catch(e) {
    }

    // If we don't have a GL context, give up now

    if (!gl) {
        alert("Unable to initialize WebGL. Your browser may not support it.");
    }
}

function initBuffers() {

    var latitudeBands = 30;
    var longitudeBands = 30;
    var radius = 2;

    //x = r sinθ cosφ
    //y = r cosθ
    //z = r sinθ sinφ
    var vertexPositionData = [];
    var normalData = [];
    var textureCoordData = [];
    for(var latNumber = 0; latNumber <= latitudeBands; latNumber++){
        var theta = latNumber * Math.PI / latitudeBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for(var longNumber = 0; longNumber <= longitudeBands; longNumber++){
            var phi = longNumber * 2 * Math.PI / longitudeBands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);

            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = - sinPhi * sinTheta;
            // var z = cosPhi * sinTheta;
            // var y = cosTheta;
            // var x = sinPhi * sinTheta;

            var u = (longNumber / longitudeBands);
            var v = 1 - (latNumber / latitudeBands);

            normalData.push(x);
            normalData.push(y);
            normalData.push(z);
            textureCoordData.push(u);
            textureCoordData.push(v);
            vertexPositionData.push(radius * x);
            vertexPositionData.push(radius * y);
            vertexPositionData.push(radius * z);
        }
    }

    var indexData = [];
    for(var latNumber = 0; latNumber < latitudeBands; latNumber++){
        for(var longNumber = 0; longNumber < longitudeBands; longNumber++){
            var first = (latNumber * (longitudeBands + 1)) + longNumber;
            var second = first + longitudeBands + 1;

            indexData.push(first);
            indexData.push(second);
            indexData.push(first + 1);

            indexData.push(second);
            indexData.push(second + 1);
            indexData.push(first + 1);

        }
    }

    moonVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositionData),gl.STATIC_DRAW);
    moonVertexPositionBuffer.itemSize = 3;
    moonVertexPositionBuffer.numItems = vertexPositionData.length / 3;

    moonVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexTextureCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordData),gl.STATIC_DRAW);
    moonVertexTextureCoordBuffer.itemSize = 2;
    moonVertexTextureCoordBuffer.numItems = textureCoordData.length / 2;

    moonVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalData), gl.STATIC_DRAW);
    moonVertexNormalBuffer.itemSize = 3;
    moonVertexNormalBuffer.numItems = normalData.length / 3;

    moonVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, moonVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
    moonVertexIndexBuffer.itemSize = 1;
    moonVertexIndexBuffer.numItems = indexData.length;

    earthVertexBuffer = gl.createBuffer();
    earthNormalBuffer = gl.createBuffer();
    earthTexCoordBuffer = gl.createBuffer();
}


function initTextures(){
    moonTexture = gl.createTexture();
    moonImage = new Image();
    moonImage.onload = function(){
        handleTextureLoaded(moonImage,moonTexture);
    };
    moonImage.src = 'image/texture.jpg';

    var texture = gl.createTexture();
    var image = new Image();
    image.onload = function(){
        handleTextureLoaded2(image,texture);
    };
    //image.src = 'image/texture.jpg';
    //textureList.push(texture);


    var radius = 1;
    var level = 4;

    var n = Math.pow(2,level);
     for(var column = 0;column < n;column++){  
        for(var row = 0;row < n;row++){  
            var texture = createTexture(level,row,column,radius);  
            textureList.push(texture);  
        }  
    }
    
    // var tt = createTexture(level,12,12,radius);
    // textureList.push(tt);

}


function createTexture(level, row, column, R){
    function handleLoadedTexture(texture) {  
        gl.bindTexture(gl.TEXTURE_2D, texture);  
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);  
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);  
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);  
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);  
        gl.bindTexture(gl.TEXTURE_2D, null); 
        texture.loaded = true; 
    }  
    var texture = gl.createTexture();                 
    texture.level = level;  
    texture.row = row;  
    texture.column = column;  
    var n = Math.pow(2,level);  
    var eachLog = 360 / n;//每列所跨的经度  
    var eachLat = 85.05112877980659 * 2 / n;//每列所跨的纬度  
    texture.minLog = -180 + eachLog * column;//每个图片的经度范围中的最小值  
    texture.maxLog = texture.minLog + eachLog;//每个图片的经度范围中的最大值  
    texture.maxLat = 85.05112877980659 - eachLat * row;//每个图片的纬度范围中的最大值  
    texture.minLat = texture.maxLat - eachLat;//每个图片的纬度范围中的最小值  
                  
    var pLeftBottom     = lonlatToXYZ(texture.minLog,texture.minLat,R);  
    var pRightBottom    = lonlatToXYZ(texture.maxLog,texture.minLat,R);  
    var pLeftTop        = lonlatToXYZ(texture.minLog,texture.maxLat,R);  
    var pRightTop       = lonlatToXYZ(texture.maxLog,texture.maxLat,R);  
    var vertices        =   [pLeftBottom[0],pLeftBottom[1],pLeftBottom[2],  
                            pRightBottom[0],pRightBottom[1],pRightBottom[2],  
                            pLeftTop[0],pLeftTop[1],pLeftTop[2],  
                            pRightTop[0],pRightTop[1],pRightTop[2]];  
    var textureCoords = [0,0,  
                         1,0,  
                         0,1,  
                         1,1];  
    var normals = [pLeftBottom[0],pLeftBottom[1],pLeftBottom[2],  
                    pRightBottom[0],pRightBottom[1],pRightBottom[2],  
                    pLeftTop[0],pLeftTop[1],pLeftTop[2],  
                    pRightTop[0],pRightTop[1],pRightTop[2]];  
    texture.vertices = vertices;  
    texture.textureCoords = textureCoords;  
    texture.normals = normals;  
    texture.loaded = false;

    texture.image = new Image();  
    texture.image.onload = function () {  
        handleLoadedTexture(texture);  
    };  
    texture.image.crossOrigin = '';//很重要，因为图片是跨域获得的，所以一定要加上此句代码  
    //"http://otile1.mqcdn.com/tiles/1.0.0/osm/"+level+"/"+column+"/"+row+".jpg";  
    //texture.image.src = "http://a.tile.openstreetmap.org/"+level+"/"+column+"/"+row+".png";    
    
    texture.image.src = "http://mt2.google.cn/vt/x="+ column +"&y="+ row +"&z=" + level;           
                  
    return texture; 
}

function handleTextureLoaded(image,texture){
    console.log("handleTextureLoaded, image=" + image);


    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    //当贴图的是2的n次方的时候
    //    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    //    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    //当贴图的不是2的n次方的时候
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); //gl.NEAREST is also allowed, instead of gl.LINEAR, as neither mipmap.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); //Prevents s-coordinate wrapping (repeating).
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); //Prevents t-coordinate wrapping (repeating).


    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D,null);
    
}


function handleTextureLoaded2(image,texture){

    texture.loaded = true;
    gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    //当贴图的是2的n次方的时候
    //    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    //    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    //当贴图的不是2的n次方的时候
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); //gl.NEAREST is also allowed, instead of gl.LINEAR, as neither mipmap.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); //Prevents s-coordinate wrapping (repeating).
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); //Prevents t-coordinate wrapping (repeating).


    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D,null);

    //顶点
    var vertices = [
        1.0,1.0,0.0,
        -1.0,1.0,0.0,
        1.0,-1.0,0.0,
        -1.0,-1.0,0.0
    ];
    // gl.bindBuffer(gl.ARRAY_BUFFER,earthVertexBuffer);
    // gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);

    //颜色
    var normal = [
        0,0,22,
        0,0,22,
        0,0,1,
        0,0,1
    ];
    // gl.bindBuffer(gl.ARRAY_BUFFER,earthNormalBuffer);
    // gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(normal),gl.STATIC_DRAW);

    var tex = [
        1.0,  1.0,
        0.0,  1.0,
        1.0,  0.0,
        0.0,  0.0
    ];
    // gl.bindBuffer(gl.ARRAY_BUFFER,earthTexCoordBuffer);
    // gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(tex),fl.STATIC_DRAW);
    // 
    
    texture.vertices = vertices;
    texture.normals = normal;
    texture.textureCoords = tex;

}

function drawScene() {
    console.log('drawScene');
    // Clear the canvas before we start drawing on it.

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Establish the perspective with which we want to view the
    // scene. Our field of view is 45 degrees, with a width/height
    // ratio of 640:480, and we only want to see objects between 0.1 units
    // and 100 units away from the camera.

    perspectiveMatrix = makePerspective(45, 640.0/480.0, 0.1, 100.0);

    // Set the drawing position to the "identity" point, which is
    // the center of the scene.

    loadIdentity();

    // Now move the drawing position a bit to where we want to start
    // drawing the cube.

    mvTranslate([0.0, 0.0, z]);

    // Save the current matrix, then rotate before we draw.

    mvPushMatrix();

    
    multMatrix(moonRotationMatrix);
    //mvRotate(cubeRotation, [0, 1, 0]);

    // Draw the cube by binding the array buffer to the cube's vertices
    // array, setting attributes, and pushing it to GL.

    // gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexPositionBuffer);
    // gl.vertexAttribPointer(vertexPositionAttribute, moonVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    // gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexTextureCoordBuffer);
    // gl.vertexAttribPointer(textureCoordAttribute, moonVertexTextureCoordBuffer.itemSize, gl.FLOAT,false,0,0);

    // gl.bindBuffer(gl.ARRAY_BUFFER, moonVertexNormalBuffer);
    // gl.vertexAttribPointer(vertexNormalAttribute, moonVertexNormalBuffer.itemSize, gl.FLOAT,false,0,0);

    // gl.activeTexture(gl.TEXTURE0);
    // gl.bindTexture(gl.TEXTURE_2D, moonTexture);
    // gl.uniform1i(gl.getUniformLocation(shaderProgram,"uSampler"),0);


    // // Draw the cube.

    // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, moonVertexIndexBuffer);
    // setMatrixUniforms();
    // gl.drawElements(gl.TRIANGLES, moonVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    
    //////////////////////////////////////////////////////////////////////////////////////////
    
    for(var i = 0; i < textureList.length; i++){

        var texture = textureList[i];

        if(texture.loaded){
            gl.bindBuffer(gl.ARRAY_BUFFER,earthVertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(texture.vertices),gl.STATIC_DRAW);
            gl.vertexAttribPointer(vertexPositionAttribute,3,gl.FLOAT,false,0,0);

            gl.bindBuffer(gl.ARRAY_BUFFER,earthNormalBuffer);
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(texture.normals),gl.STATIC_DRAW);
            gl.vertexAttribPointer(vertexNormalAttribute,3,gl.FLOAT,false,0,0);

            gl.bindBuffer(gl.ARRAY_BUFFER,earthTexCoordBuffer);
            gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(texture.textureCoords),gl.STATIC_DRAW);
            gl.vertexAttribPointer(textureCoordAttribute,2,gl.FLOAT,false,0,0);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.uniform1i(gl.getUniformLocation(shaderProgram,"uSampler"),0);

            setMatrixUniforms();
            gl.drawArrays(gl.TRIANGLE_STRIP,0,4);

        }
    }




    ////////////////////////////////////////////////////////////////////////////////////////// 
    


   
    // Restore the original matrix

    mvPopMatrix();

    // Update the rotation for the next draw, if it's time to do so.

    var currentTime = (new Date).getTime();
    if (lastCubeUpdateTime) {
        var delta = currentTime - lastCubeUpdateTime;

        cubeRotation += (30 * delta) / 1000.0;
    }

    lastCubeUpdateTime = currentTime;
}

function initShaders() {
    var fragmentShader = getShader(gl, "shader-fs");
    var vertexShader = getShader(gl, "shader-vs");

    // Create the shader program

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // If creating the shader program failed, alert

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Unable to initialize the shader program.");
    }

    gl.useProgram(shaderProgram);

    vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(vertexPositionAttribute);

    //    vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
    //    gl.enableVertexAttribArray(vertexColorAttribute);

    textureCoordAttribute = gl.getAttribLocation(shaderProgram,"aTextureCoord");
    gl.enableVertexAttribArray(textureCoordAttribute);

    vertexNormalAttribute = gl.getAttribLocation(shaderProgram,"aVertexNormal");
    gl.enableVertexAttribArray(vertexNormalAttribute);
}

function getShader(gl, id) {
    var shaderScript = document.getElementById(id);

    // Didn't find an element with the specified ID; abort.

    if (!shaderScript) {
        return null;
    }

    // Walk through the source element's children, building the
    // shader source string.

    var theSource = "";
    var currentChild = shaderScript.firstChild;

    while(currentChild) {
        if (currentChild.nodeType == 3) {
            theSource += currentChild.textContent;
        }

        currentChild = currentChild.nextSibling;
    }

    // Now figure out what type of shader script we have,
    // based on its MIME type.

    var shader;

    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;  // Unknown shader type
    }

    // Send the source to the shader object

    gl.shaderSource(shader, theSource);

    // Compile the shader program

    gl.compileShader(shader);

    // See if it compiled successfully

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}


function handleMouseUp(event){
    mouseDown = false;
}

function handleMouseMove(event){
    if(!mouseDown) return;

    var newX = event.clientX;
    var newY = event.clientY;

    var deltaX = newX - lastMouseX;
    var newRotationMatrix = Matrix.I(4);
    var inRadianX = (deltaX / 5) * Math.PI / 180.0;
    newRotationMatrix = newRotationMatrix.x(
            Matrix.Rotation(inRadianX, $V([0, 1, 0])).ensure4x4()
        );

    var deltaY = newY - lastMouseY;
    var inRadianY = (deltaY / 5) * Math.PI / 180.0;
    newRotationMatrix = newRotationMatrix.x(
            Matrix.Rotation(inRadianY, $V([1, 0, 0])).ensure4x4()
        );

    //moonRotationMatrix = moonRotationMatrix.x(newRotationMatrix);
    moonRotationMatrix = newRotationMatrix.x(moonRotationMatrix);

    lastMouseY = newY;
    lastMouseX = newX;

}

function handleKeyDown(event){
    currentPressedKeys[event.keyCode] = true;
}
    

function handleKeyUp(event){
    currentPressedKeys[event.keyCode] = false;
}

function handleKeys(){
    if (currentPressedKeys[33]) {
        //Page Up
        z -= 0.05;
    };
    if (currentPressedKeys[34]) {
        //Page Down
        z += 0.05;
    };
    if (currentPressedKeys[37]) {
        //Left cursor key
        //ySpeed -= 1;
    };
    if(currentPressedKeys[39]){
        //Right cursor key
        //ySpeed += 1;
    };
    if (currentPressedKeys[38]) {
        //up
        //xSpeed -= 1;
    };
    if (currentPressedKeys[40]) {
        //down
        //xSpeed += 1;
    };

}

function loadIdentity() {
    mvMatrix = Matrix.I(4);
}

function multMatrix(m) {
    mvMatrix = mvMatrix.x(m);
}

function mvTranslate(v) {
    multMatrix(Matrix.Translation($V([v[0], v[1], v[2]])).ensure4x4());
}

function setMatrixUniforms() {
    var pUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    gl.uniformMatrix4fv(pUniform, false, new Float32Array(perspectiveMatrix.flatten()));

    var mvUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    gl.uniformMatrix4fv(mvUniform, false, new Float32Array(mvMatrix.flatten()));

    var normalMatrix = mvMatrix.inverse();
    normalMatrix = normalMatrix.transpose();
    var nUniform = gl.getUniformLocation(shaderProgram,"uNormalMatrix");
    gl.uniformMatrix4fv(nUniform,false,new Float32Array(normalMatrix.flatten()));
}

function mvPushMatrix(m) {
    if (m) {
        mvMatrixStack.push(m.dup());
        mvMatrix = m.dup();
    } else {
        mvMatrixStack.push(mvMatrix.dup());
    }
}

function mvPopMatrix() {
    if (!mvMatrixStack.length) {
        throw("Can't pop from an empty matrix stack.");
    }

    mvMatrix = mvMatrixStack.pop();
    return mvMatrix;
}

function mvRotate(angle, v) {
    var inRadians = angle * Math.PI / 180.0;

    var m = Matrix.Rotation(inRadians, $V([v[0], v[1], v[2]])).ensure4x4();
    multMatrix(m);
}

function lonlatToXYZ(longitude,latitude,radius){
    var vertice = [];  
    var radianLog = Math.PI/180*longitude;  
    var radianLat = Math.PI/180*latitude;  
    var sin1 = Math.sin(radianLog);  
    var cos1 = Math.cos(radianLog);  
    var sin2 = Math.sin(radianLat);  
    var cos2 = Math.cos(radianLat);  
    var x = radius*sin1*cos2;  
    var y = radius*sin2;  
    var z = radius*cos1*cos2;  
    vertice.push(x);  
    vertice.push(y);  
    vertice.push(z);  
    return vertice;
}

