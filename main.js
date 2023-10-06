import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// Global
let collidableObjects = [];
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.25, 100);
let cameraOffset = new THREE.Vector3(0, 3, 10);
let light = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 3);

// Set scene
scene.background = new THREE.Color(0xdddddd);
scene.fog = new THREE.Fog(0xdddddd, 20, 100);

// Set camera
camera.position.set(- 5, 3, 10);
camera.lookAt(0, 2, 0);

// Set light
light.position.set(0, 30, 0);
scene.add(light);

// Set ground
let mesh = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshPhongMaterial({ color: 0x444444, depthWrite: true }));
mesh.position.y = 0;
mesh.rotation.x = - Math.PI / 2;
scene.add(mesh);

// Set grid on the ground
let grid = new THREE.GridHelper(200, 100, 0x000000, 0x000000);
grid.position.y = 0;
grid.material.opacity = 0.1;
grid.material.transparent = true;
scene.add(grid);

// Interactive boxes
class MagicBox {
    constructor() {
        this.group = new THREE.Group();

        this.box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x777777, transparent: true, opacity: 0.5 }));
        this.box.isMagicBox = true;
        this.group.add(this.box);

        // Set the box's position to random valuessMath.random() * 10 - 5);
        this.group.position.set(Math.random() * 30 - 15, 0.5, Math.random() * 30 - 15);

        // Create a BoxHelper for visualizing the bounding box
        this.boxHelper = new THREE.BoxHelper(this.box, 0x00000000);
        // this.group.add(this.boxHelper);
        this.box.canReceiveMouseEvents = false;
        this.box.name = Math.floor(Math.random() * 1000);
    }

    // Call this method whenever the MagicBox is moved or transformed
    updateBoxHelper() {
        this.boxHelper.update();
    }

    // Check if there is character within 1 unit of distance, if so, toggle color
    changeColor(character) {
        const distance = this.group.position.distanceTo(character.group.position);
        if (distance < 2) {
            this.box.material.color.setHex(0xff0000);
            this.box.canReceiveMouseEvents = true;
        } else {
            this.box.material.color.setHex(0x777777);
            this.box.canReceiveMouseEvents = false;
        }
    }
}

// Create an array of MagicBoxes
const magicBoxes = [];
for (let i = 0; i < 10; i++) {
    const magicBox = new MagicBox();
    scene.add(magicBox.group);
    magicBoxes.push(magicBox);
    collidableObjects.push(magicBox.group);
}

// Character
class SimpleCharacter {
    constructor() {
        this.group = new THREE.Group();

        const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x777777 });
        const limbMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });

        // Body
        this.body = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), bodyMaterial);
        this.body.position.set(0, 0.5, 0);
        this.group.add(this.body);

        // Legs
        this.leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1, 0.25), limbMaterial);
        this.leftLeg.position.set(-0.3, -0.5, 0);
        this.group.add(this.leftLeg);

        this.rightLeg = this.leftLeg.clone();
        this.rightLeg.position.x = 0.3;
        this.group.add(this.rightLeg);

        this.isWalking = false;

        // Initialize raycaster
        this.raycaster = new THREE.Raycaster();

        // Initialize ray directions
        this.frontRay = new THREE.Vector3(0, 0, -1);
        this.backRay = new THREE.Vector3(0, 0, 1);

        // Show raycaster rays
        this.raycasterHelper = new THREE.Group();
        this.raycasterHelper.add(new THREE.ArrowHelper(this.frontRay, new THREE.Vector3(), 1, 0xff0000));
        this.raycasterHelper.add(new THREE.ArrowHelper(this.backRay, new THREE.Vector3(), 1, 0x0000ff));

        // scene.add(this.raycasterHelper);

    }

    toggleWalking() {
        this.isWalking = !this.isWalking;
    }

    move(x, y, z) {
        this.group.position.set(x, y, z);
    }

    walk() {
        if (this.isWalking) {
            this.leftLeg.rotation.x = Math.sin(Date.now() * 0.005) * 0.5;
            this.rightLeg.rotation.x = Math.sin(Date.now() * 0.005 + Math.PI) * 0.5;
        } else {
            // Reset leg rotation to stand still when not walking
            this.leftLeg.rotation.x = 0;
            this.rightLeg.rotation.x = 0;
        }
    }

    canMove(direction) {
        // Adjust the ray's origin to be closer to the character's base
        const rayOrigin = this.group.position.clone().add(new THREE.Vector3(0, 0, 0));
        this.raycaster.set(rayOrigin, direction);

        const intersections = this.raycaster.intersectObjects(collidableObjects);

        console.log(intersections);

        if (intersections.length > 0) {
            // If the intersection distance is too close to 0, ignore it
            if (intersections[0].distance < 0.0001) {
                return true;
            }
            // Check the adjusted collision threshold
            if (intersections[0].distance < 1) {
                return false;
            }
        }
        return true;
    }

    updateRaycasterHelper() {
        this.raycasterHelper.position.copy(this.group.position);
        this.raycasterHelper.children[0].setDirection(this.frontRay);
        this.raycasterHelper.children[1].setDirection(this.backRay);
    }

    moveForward(distance) {

        // Auto hide the popup
        document.getElementById('popup').style.display = 'none';

        this.frontRay = this.group.getWorldDirection(new THREE.Vector3()).negate();
        this.backRay = this.group.getWorldDirection(new THREE.Vector3());

        if (this.canMove(this.frontRay)) {
            this.group.translateZ(-distance);
            this.isWalking = true;
        }

        this.updateRaycasterHelper();
    }

    moveBackward(distance) {
        // Auto hide the popup
        document.getElementById('popup').style.display = 'none';

        this.frontRay = this.group.getWorldDirection(new THREE.Vector3()).negate();
        this.backRay = this.group.getWorldDirection(new THREE.Vector3());

        if (this.canMove(this.backRay)) {
            this.group.translateZ(distance);
            this.isWalking = true;
        }

        this.updateRaycasterHelper();
    }


    turnLeft(angle) {
        this.group.rotation.y += angle;

        // Update ray directions
        this.frontRay = this.group.getWorldDirection(new THREE.Vector3()).negate();
        this.backRay = this.group.getWorldDirection(new THREE.Vector3());

        this.updateRaycasterHelper();
    }

    turnRight(angle) {
        this.group.rotation.y -= angle;

        // Update ray directions
        this.frontRay = this.group.getWorldDirection(new THREE.Vector3()).negate();
        this.backRay = this.group.getWorldDirection(new THREE.Vector3());

        this.updateRaycasterHelper();
    }

}

// Create a character
const character = new SimpleCharacter();
scene.add(character.group);
character.move(0, 1, 0);  // Move character to (0, 1, 0)

// Add renderer
let renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true;

// Add mouse event listener
renderer.domElement.addEventListener('mousedown', onMouseDown, false);

function onMouseDown(event) {
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(scene.children); // You can also use a specific array of objects

    // See if there was a click on a magic box
    for (const intersect of intersects) {
        // Check if the intersected object is a magic box 
        // console.log(intersect.object);
        if (intersect.object.isMagicBox) {
            if (intersect.object.canReceiveMouseEvents) {
                // Show the modal id #popup and change the text to the intersected object's name
                document.getElementById('popup').style.display = 'block';
                document.getElementById('popup-text').innerHTML = intersect.object.name;
                console.log(intersect.object.name);
            }
        }
    }
}

// Add stats
let stats = new Stats();
document.body.appendChild(stats.dom);

// Add UI controls 
let gui = new GUI();

// Add instructions: wasd
let instructions = document.createElement('div');
instructions.style.position = 'absolute';
instructions.style.top = '10px';
instructions.style.width = '100%';
instructions.style.textAlign = 'center';
instructions.innerHTML = 'WASD to move, Space to interact';
document.body.appendChild(instructions);

// Add cameraOffset gui
let cameraOffsetGui = gui.addFolder('cameraOffset');
cameraOffsetGui.add(cameraOffset, 'x', -10, 10);
cameraOffsetGui.add(cameraOffset, 'y', -10, 10);
cameraOffsetGui.add(cameraOffset, 'z', -10, 10);

cameraOffsetGui.open();

// Add event listeners 
const keys = {
    w: false,
    a: false,
    s: false,
    d: false
};

document.addEventListener('keydown', (event) => {
    switch (event.key.toLowerCase()) {
        case 'w':
            keys.w = true;
            break;
        case 'a':
            keys.a = true;
            break;
        case 's':
            keys.s = true;
            break;
        case 'd':
            keys.d = true;
            break;
    }
});

document.addEventListener('keyup', (event) => {
    switch (event.key.toLowerCase()) {
        case 'w':
            keys.w = false;
            break;
        case 'a':
            keys.a = false;
            break;
        case 's':
            keys.s = false;
            break;
        case 'd':
            keys.d = false;
            break;
    }
});

function updateCamera() {
    // Define an offset for the camera relative to the character
    const offset = new THREE.Vector3(cameraOffset.x, cameraOffset.y, cameraOffset.z);

    // Apply character's rotation to the offset
    offset.applyQuaternion(character.group.quaternion);

    // Set camera position based on character's position and offset
    camera.position.copy(character.group.position).add(offset);

    // Set camera to look at the character's position
    camera.lookAt(character.group.position);
}

function animate() {
    requestAnimationFrame(animate);

    // Movement and rotation based on keys
    if (keys.w) character.moveForward(0.1);
    if (keys.s) character.moveBackward(0.1);
    if (keys.a) character.turnLeft(0.025);
    if (keys.d) character.turnRight(0.025);

    // For all magic boxes, check if character is within 1 unit of distance, if so, toggle color
    for (const magicBox of magicBoxes) {
        magicBox.changeColor(character);
    }

    // Check if no movement keys are pressed, then stop walking animation
    if (!keys.w && !keys.s) {
        character.isWalking = false;
    }

    character.walk();

    updateCamera();
    renderer.render(scene, camera);

    stats.update();
}

animate();