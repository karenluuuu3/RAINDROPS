// script.js

document.addEventListener('DOMContentLoaded', () => {
    const glCanvas = document.getElementById('glCanvas');
    const d2Canvas = document.getElementById('2dCanvas');
    const gl = glCanvas.getContext('webgl');
    const ctx = d2Canvas.getContext('2d');

    let points = [
        {"x": 0.0, "gray": 0.2},
        {"x": 0.2, "gray": 1.0},
        {"x": 0.4, "gray": 0.2},
        {"x": 0.6, "gray": 1.0},
        {"x": 0.8, "gray": 0.2},
        {"x": 1.0, "gray": 0.7}
    ];

    window.clearPoints = function() {
        points = [];
        drawScene();
    };

    if (!gl) {
        console.error('Unable to initialize WebGL. Your browser may not support it.');
        return;
    }

    const MAX_POINTS = 10;
    const vsSource = `
        attribute vec4 a_position;
        void main() {
            gl_Position = a_position;
        }
    `;

    const fsSource = `
        precision mediump float;
        uniform vec2 u_resolution;
        uniform vec2 u_points[${MAX_POINTS}];
        uniform int u_numPoints;

        void main() {
            vec2 st = gl_FragCoord.xy / u_resolution.xy;
            float gray = 0.0;
            
            if (u_numPoints == 0) {
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                return;
            }

            if (u_numPoints == 1) {
                gray = u_points[0].y;
            } else {
                if (st.x <= u_points[0].x) {
                    gray = u_points[0].y;
                } else if (st.x >= u_points[u_numPoints - 1].x) {
                    gray = u_points[u_numPoints - 1].y;
                } else {
                    for (int i = 0; i < ${MAX_POINTS} - 1; i++) {
                        if (i < u_numPoints - 1) {
                            vec2 pA = u_points[i];
                            vec2 pB = u_points[i + 1];

                            if (st.x >= pA.x && st.x <= pB.x) {
                                float t = (st.x - pA.x) / (pB.x - pA.x);
                                gray = mix(pA.y, pB.y, smoothstep(0.0, 1.0, t));
                                break;
                            }
                        }
                    }
                }
            }
            
            gl_FragColor = vec4(gray, gray, gray, 1.0);
        }
    `;

    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shaders:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    function createProgram(gl, vsSource, fsSource) {
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
        
        if (!vertexShader || !fragmentShader) {
             return null;
        }

        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error('Unable to initialize the shader program:', gl.getProgramInfoLog(shaderProgram));
            return null;
        }
        return shaderProgram;
    }

    const shaderProgram = createProgram(gl, vsSource, fsSource);

    if (!shaderProgram) {
        return;
    }
    
    gl.useProgram(shaderProgram);

    const positionAttributeLocation = gl.getAttribLocation(shaderProgram, 'a_position');
    const resolutionUniformLocation = gl.getUniformLocation(shaderProgram, 'u_resolution');
    const pointsUniformLocation = gl.getUniformLocation(shaderProgram, 'u_points');
    const numPointsUniformLocation = gl.getUniformLocation(shaderProgram, 'u_numPoints');

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
        -1.0, 1.0, 1.0, 1.0, -1.0, -1.0,
        -1.0, -1.0, 1.0, 1.0, 1.0, -1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionAttributeLocation);

    function drawScene() {
        // 1. 繪製 WebGL 漸變
        gl.viewport(0, 0, glCanvas.width, glCanvas.height);
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(resolutionUniformLocation, glCanvas.width, glCanvas.height);

        const pointsData = new Float32Array(MAX_POINTS * 2);
        points.forEach((p, i) => {
            pointsData[i * 2] = p.x;
            pointsData[i * 2 + 1] = p.gray;
        });

        gl.uniform1i(numPointsUniformLocation, points.length);
        gl.uniform2fv(pointsUniformLocation, pointsData);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // 2. 繪製 2D 點 (用於視覺化)
        ctx.clearRect(0, 0, d2Canvas.width, d2Canvas.height);
        ctx.lineWidth = 2;

        if (points.length > 1) {
            points.sort((a, b) => a.x - b.x);
            ctx.beginPath();
            ctx.moveTo(points[0].x * d2Canvas.width, (1.0 - points[0].gray) * d2Canvas.height);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x * d2Canvas.width, (1.0 - points[i].gray) * d2Canvas.height);
            }
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.stroke();
        }

        points.forEach(p => {
            const x = p.x * d2Canvas.width;
            const y = (1.0 - p.gray) * d2Canvas.height;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, 2 * Math.PI);
            ctx.fillStyle = `rgb(${p.gray * 255}, ${p.gray * 255}, ${p.gray * 255})`;
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.fill();
            ctx.stroke();
        });
    }

    d2Canvas.addEventListener('click', (e) => {
        const rect = d2Canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const normalizedX = x / d2Canvas.width;
        const normalizedGray = 1.0 - (y / d2Canvas.height);

        const existingPointIndex = points.findIndex(p => {
            const px = p.x * d2Canvas.width;
            const py = (1.0 - p.gray) * d2Canvas.height;
            const distance = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
            return distance < 10;
        });

        if (existingPointIndex !== -1) {
            points.splice(existingPointIndex, 1);
        } else {
            if (points.length >= MAX_POINTS) {
                console.warn(`已達到最大點數限制 ${MAX_POINTS}，無法新增。`);
                return;
            }
            points.push({ x: normalizedX, gray: normalizedGray });
        }
        
        points.sort((a, b) => a.x - b.x);
        drawScene();
    });

    drawScene();
});