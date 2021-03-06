(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

/* Classes and Libraries */
const Game = require('./game');
const Vector = require('./vector');
const Camera = require('./camera');
const Player = require('./player');
const BulletPool = require('./bullet_pool');
const Tilemap = require('./tilemap');



/* Global variables */
var canvas = document.getElementById('screen');
var game = new Game(canvas, update, render);
var input = {
  up: false,
  down: false,
  left: false,
  right: false
}
var camera = new Camera(canvas);
var bullets = new BulletPool(10);
var missiles = [];
var player = new Player(bullets, missiles);
var tilemapBackground = require('../tilemaps/background.json');
var background = new Tilemap(tilemapBackground);

/**
 * @function onkeydown
 * Handles keydown events
 */
window.onkeydown = function(event) {
  switch(event.key) {
    case "ArrowUp":
    case "w":
      input.up = true;
      event.preventDefault();
      break;
    case "ArrowDown":
    case "s":
      input.down = true;
      event.preventDefault();
      break;
    case "ArrowLeft":
    case "a":
      input.left = true;
      event.preventDefault();
      break;
    case "ArrowRight":
    case "d":
      input.right = true;
      event.preventDefault();
      break;
  }
}

/**
 * @function onkeyup
 * Handles keydown events
 */
window.onkeyup = function(event) {
  switch(event.key) {
    case "ArrowUp":
    case "w":
      input.up = false;
      event.preventDefault();
      break;
    case "ArrowDown":
    case "s":
      input.down = false;
      event.preventDefault();
      break;
    case "ArrowLeft":
    case "a":
      input.left = false;
      event.preventDefault();
      break;
    case "ArrowRight":
    case "d":
      input.right = false;
      event.preventDefault();
      break;
  }
}

/**
 * @function masterLoop
 * Advances the game in sync with the refresh rate of the screen
 * @param {DOMHighResTimeStamp} timestamp the current time
 */
var masterLoop = function(timestamp) {
  game.loop(timestamp);
  window.requestAnimationFrame(masterLoop);
}
masterLoop(performance.now());

/**
 * @function update
 * Updates the game state, moving
 * game objects and handling interactions
 * between them.
 * @param {DOMHighResTimeStamp} elapsedTime indicates
 * the number of milliseconds passed since the last frame.
 */
function update(elapsedTime) {

  // update the player
  player.update(elapsedTime, input);

  // update the camera
  camera.update(player.position);

  // Update bullets
  bullets.update(elapsedTime, function(bullet){
    if(!camera.onScreen(bullet)) return true;
    return false;
  });

  // Update missiles
  var markedForRemoval = [];
  missiles.forEach(function(missile, i){
    missile.update(elapsedTime);
    if(Math.abs(missile.position.x - camera.x) > camera.width * 2)
      markedForRemoval.unshift(i);
  });
  // Remove missiles that have gone off-screen
  markedForRemoval.forEach(function(index){
    missiles.splice(index, 1);
  });
}

/**
  * @function render
  * Renders the current game state into a back buffer.
  * @param {DOMHighResTimeStamp} elapsedTime indicates
  * the number of milliseconds passed since the last frame.
  * @param {CanvasRenderingContext2D} ctx the context to render to
  */
function render(elapsedTime, ctx) {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, 1024, 786);

  // TODO: Render background
  background.render(ctx);

  // Transform the coordinate system using
  // the camera position BEFORE rendering
  // objects in the world - that way they
  // can be rendered in WORLD cooridnates
  // but appear in SCREEN coordinates
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  renderWorld(elapsedTime, ctx);
  ctx.restore();

  // Render the GUI without transforming the
  // coordinate system
  renderGUI(elapsedTime, ctx);
}

/**
  * @function renderWorld
  * Renders the entities in the game world
  * IN WORLD COORDINATES
  * @param {DOMHighResTimeStamp} elapsedTime
  * @param {CanvasRenderingContext2D} ctx the context to render to
  */
function renderWorld(elapsedTime, ctx) {
    // Render the bullets
    bullets.render(elapsedTime, ctx);

    // Render the missiles
    missiles.forEach(function(missile) {
      missile.render(elapsedTime, ctx);
    });

    // Render the player
    player.render(elapsedTime, ctx);
}

/**
  * @function renderGUI
  * Renders the game's GUI IN SCREEN COORDINATES
  * @param {DOMHighResTimeStamp} elapsedTime
  * @param {CanvasRenderingContext2D} ctx
  */
function renderGUI(elapsedTime, ctx) {
  // TODO: Render the GUI
}

},{"../tilemaps/background.json":10,"./bullet_pool":2,"./camera":3,"./game":4,"./player":6,"./tilemap":8,"./vector":9}],2:[function(require,module,exports){
"use strict";

/**
 * @module BulletPool
 * A class for managing bullets in-game
 * We use a Float32Array to hold our bullet info,
 * as this creates a single memory buffer we can
 * iterate over, minimizing cache misses.
 * Values stored are: positionX, positionY, velocityX,
 * velocityY in that order.
 */
module.exports = exports = BulletPool;

/**
 * @constructor BulletPool
 * Creates a BulletPool of the specified size
 * @param {uint} size the maximum number of bullets to exits concurrently
 */
function BulletPool(maxSize) {
  this.pool = new Float32Array(4 * maxSize);
  this.end = 0;
  this.max = maxSize;
}

/**
 * @function add
 * Adds a new bullet to the end of the BulletPool.
 * If there is no room left, no bullet is created.
 * @param {Vector} position where the bullet begins
 * @param {Vector} velocity the bullet's velocity
*/
BulletPool.prototype.add = function(position, velocity) {
  if(this.end < this.max) {
    this.pool[4*this.end] = position.x;
    this.pool[4*this.end+1] = position.y;
    this.pool[4*this.end+2] = velocity.x;
    this.pool[4*this.end+3] = velocity.y;
    this.end++;
  }
}

/**
 * @function update
 * Updates the bullet using its stored velocity, and
 * calls the callback function passing the transformed
 * bullet.  If the callback returns true, the bullet is
 * removed from the pool.
 * Removed bullets are replaced with the last bullet's values
 * and the size of the bullet array is reduced, keeping
 * all live bullets at the front of the array.
 * @param {DOMHighResTimeStamp} elapsedTime
 * @param {function} callback called with the bullet's position,
 * if the return value is true, the bullet is removed from the pool
 */
BulletPool.prototype.update = function(elapsedTime, callback) {
  for(var i = 0; i < this.end; i++){
    // Move the bullet
    this.pool[4*i] += this.pool[4*i+2];
    this.pool[4*i+1] += this.pool[4*i+3];
    // If a callback was supplied, call it
    if(callback && callback({
      x: this.pool[4*i],
      y: this.pool[4*i+1]
    })) {
      // Swap the current and last bullet if we
      // need to remove the current bullet
      this.pool[4*i] = this.pool[4*(this.end-1)];
      this.pool[4*i+1] = this.pool[4*(this.end-1)+1];
      this.pool[4*i+2] = this.pool[4*(this.end-1)+2];
      this.pool[4*i+3] = this.pool[4*(this.end-1)+3];
      // Reduce the total number of bullets by 1
      this.end--;
      // Reduce our iterator by 1 so that we update the
      // freshly swapped bullet.
      i--;
    }
  }
}

/**
 * @function render
 * Renders all bullets in our array.
 * @param {DOMHighResTimeStamp} elapsedTime
 * @param {CanvasRenderingContext2D} ctx
 */
BulletPool.prototype.render = function(elapsedTime, ctx) {
  // Render the bullets as a single path
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = "black";
  for(var i = 0; i < this.end; i++) {
    ctx.moveTo(this.pool[4*i], this.pool[4*i+1]);
    ctx.arc(this.pool[4*i], this.pool[4*i+1], 2, 0, 2*Math.PI);
  }
  ctx.fill();
  ctx.restore();
}

},{}],3:[function(require,module,exports){
"use strict";

/* Classes and Libraries */
const Vector = require('./vector');

/**
 * @module Camera
 * A class representing a simple camera
 */
module.exports = exports = Camera;

/**
 * @constructor Camera
 * Creates a camera
 * @param {Rect} screen the bounds of the screen
 */
function Camera(screen) {
  this.x = 0;
  this.y = 0;
  this.width = screen.width;
  this.height = screen.height;
}

/**
 * @function update
 * Updates the camera based on the supplied target
 * @param {Vector} target what the camera is looking at
 */
Camera.prototype.update = function(target) {
  // TODO: Align camera with player
}

/**
 * @function onscreen
 * Determines if an object is within the camera's gaze
 * @param {Vector} target a point in the world
 * @return true if target is on-screen, false if not
 */
Camera.prototype.onScreen = function(target) {
  return (
     target.x > this.x &&
     target.x < this.x + this.width &&
     target.y > this.y &&
     target.y < this.y + this.height
   );
}

/**
 * @function toScreenCoordinates
 * Translates world coordinates into screen coordinates
 * @param {Vector} worldCoordinates
 * @return the tranformed coordinates
 */
Camera.prototype.toScreenCoordinates = function(worldCoordinates) {
  return Vector.subtract(worldCoordinates, this);
}

/**
 * @function toWorldCoordinates
 * Translates screen coordinates into world coordinates
 * @param {Vector} screenCoordinates
 * @return the tranformed coordinates
 */
Camera.prototype.toWorldCoordinates = function(screenCoordinates) {
  return Vector.add(screenCoordinates, this);
}

},{"./vector":9}],4:[function(require,module,exports){
"use strict";

/**
 * @module exports the Game class
 */
module.exports = exports = Game;

/**
 * @constructor Game
 * Creates a new game object
 * @param {canvasDOMElement} screen canvas object to draw into
 * @param {function} updateFunction function to update the game
 * @param {function} renderFunction function to render the game
 */
function Game(screen, updateFunction, renderFunction) {
  this.update = updateFunction;
  this.render = renderFunction;

  // Set up buffers
  this.frontBuffer = screen;
  this.frontCtx = screen.getContext('2d');
  this.backBuffer = document.createElement('canvas');
  this.backBuffer.width = screen.width;
  this.backBuffer.height = screen.height;
  this.backCtx = this.backBuffer.getContext('2d');

  // Start the game loop
  this.oldTime = performance.now();
  this.paused = false;
}

/**
 * @function pause
 * Pause or unpause the game
 * @param {bool} pause true to pause, false to start
 */
Game.prototype.pause = function(flag) {
  this.paused = (flag == true);
}

/**
 * @function loop
 * The main game loop.
 * @param{time} the current time as a DOMHighResTimeStamp
 */
Game.prototype.loop = function(newTime) {
  var game = this;
  var elapsedTime = newTime - this.oldTime;
  this.oldTime = newTime;

  if(!this.paused) this.update(elapsedTime);
  this.render(elapsedTime, this.frontCtx);

  // Flip the back buffer
  this.frontCtx.drawImage(this.backBuffer, 0, 0);
}

},{}],5:[function(require,module,exports){
"use strict";

/* Classes and Libraries */
const Vector = require('./vector');
const SmokeParticles = require('./smoke_particles');

/* Constants */
const MISSILE_SPEED = 8;

/**
 * @module Missile
 * A class representing a player's missile
 */
module.exports = exports = Missile;

/**
 * @constructor Missile
 * Creates a missile
 * @param {Vector} position the position of the missile
 * @param {Object} target the target of the missile
 */
function Missile(position, target) {
  this.position = {x: position.x, y:position.y}
  this.target = target;
  this.angle = 0;
  this.img = new Image()
  this.img.src = 'assets/helicopter.png';
  this.smokeParticles = new SmokeParticles(400);
}

/**
 * @function update
 * Updates the missile, steering it towards a locked
 * target or straight ahead
 * @param {DOMHighResTimeStamp} elapedTime
 */
Missile.prototype.update = function(elapsedTime) {

  // set the velocity
  var velocity = {x: MISSILE_SPEED, y: 0}
  if(this.target) {
    var direction = Vector.subtract(this.position, this.target);
    velocity = Vector.scale(Vector.normalize(direction), MISSILE_SPEED);
  }

  // determine missile angle
  this.angle = Math.atan2(velocity.y, velocity.x);

  // move the missile
  this.position.x += velocity.x;
  this.position.y += velocity.y;

  // emit smoke
  this.smokeParticles.emit(this.position);

  // update smoke
  this.smokeParticles.update(elapsedTime);
}

/**
 * @function render
 * Renders the missile in world coordinates
 * @param {DOMHighResTimeStamp} elapsedTime
 * @param {CanvasRenderingContext2D} ctx
 */
Missile.prototype.render = function(elapsedTime, ctx) {
  // Draw Missile
  ctx.save();
  ctx.translate(this.position.x, this.position.y);
  ctx.rotate(this.angle);
  ctx.drawImage(this.img, 76, 56, 16, 8, 0, -4, 16, 8);
  ctx.restore();
  // Draw Smoke
  this.smokeParticles.render(elapsedTime, ctx);
}
},{"./smoke_particles":7,"./vector":9}],6:[function(require,module,exports){
"use strict";

/* Classes and Libraries */
const Vector = require('./vector');
const Missile = require('./missile');

/* Constants */
const PLAYER_SPEED = 5;
const BULLET_SPEED = 10;

/**
 * @module Player
 * A class representing a player's helicopter
 */
module.exports = exports = Player;

/**
 * @constructor Player
 * Creates a player
 * @param {BulletPool} bullets the bullet pool
 */
function Player(bullets, missiles) {
  this.missiles = missiles;
  this.missileCount = 4;
  this.bullets = bullets;
  this.angle = 0;
  this.position = {x: 200, y: 200};
  this.velocity = {x: 0, y: 0};
  this.img = new Image()
  this.img.src = 'assets/tyrian.shp.007D3C.png';
}

/**
 * @function update
 * Updates the player based on the supplied input
 * @param {DOMHighResTimeStamp} elapedTime
 * @param {Input} input object defining input, must have
 * boolean properties: up, left, right, down
 */
Player.prototype.update = function(elapsedTime, input) {

  // set the velocity
  this.velocity.x = 0;
  if(input.left) this.velocity.x -= PLAYER_SPEED;
  if(input.right) this.velocity.x += PLAYER_SPEED;
  this.velocity.y = 0;
  if(input.up) this.velocity.y -= PLAYER_SPEED / 2;
  if(input.down) this.velocity.y += PLAYER_SPEED / 2;

  // determine player angle
  this.angle = 0;
  if(this.velocity.x < 0) this.angle = -1;
  if(this.velocity.x > 0) this.angle = 1;

  // move the player
  this.position.x += this.velocity.x;
  this.position.y += this.velocity.y;

  // don't let the player move off-screen
  if(this.position.x < 0) this.position.x = 0;
  if(this.position.x > 1024) this.position.x = 1024;
  if(this.position.y > 786) this.position.y = 786;
}

/**
 * @function render
 * Renders the player helicopter in world coordinates
 * @param {DOMHighResTimeStamp} elapsedTime
 * @param {CanvasRenderingContext2D} ctx
 */
Player.prototype.render = function(elapasedTime, ctx) {
  var offset = this.angle * 23;
  ctx.save();
  ctx.translate(this.position.x, this.position.y);
  ctx.drawImage(this.img, 48+offset, 57, 23, 27, -12.5, -12, 23, 27);
  ctx.restore();
}

/**
 * @function fireBullet
 * Fires a bullet
 * @param {Vector} direction
 */
Player.prototype.fireBullet = function(direction) {
  var position = Vector.add(this.position, {x:30, y:30});
  var velocity = Vector.scale(Vector.normalize(direction), BULLET_SPEED);
  this.bullets.add(position, velocity);
}

/**
 * @function fireMissile
 * Fires a missile, if the player still has missiles
 * to fire.
 */
Player.prototype.fireMissile = function() {
  if(this.missileCount > 0){
    var position = Vector.add(this.position, {x:0, y:30})
    var missile = new Missile(position);
    this.missiles.push(missile);
    this.missileCount--;
  }
}

},{"./missile":5,"./vector":9}],7:[function(require,module,exports){
"use strict";

/**
 * @module SmokeParticles
 * A class for managing a particle engine that
 * emulates a smoke trail
 */
module.exports = exports = SmokeParticles;

/**
 * @constructor SmokeParticles
 * Creates a SmokeParticles engine of the specified size
 * @param {uint} size the maximum number of particles to exist concurrently
 */
function SmokeParticles(maxSize) {
  this.pool = new Float32Array(3 * maxSize);
  this.start = 0;
  this.end = 0;
  this.wrapped = false;
  this.max = maxSize;
}

/**
 * @function emit
 * Adds a new particle at the given position
 * @param {Vector} position
*/
SmokeParticles.prototype.emit = function(position) {
  if(this.end != this.max) {
    this.pool[3*this.end] = position.x;
    this.pool[3*this.end+1] = position.y;
    this.pool[3*this.end+2] = 0.0;
    this.end++;
  } else {
    this.pool[3] = position.x;
    this.pool[4] = position.y;
    this.pool[5] = 0.0;
    this.end = 1;
  }
}

/**
 * @function update
 * Updates the particles
 * @param {DOMHighResTimeStamp} elapsedTime
 */
SmokeParticles.prototype.update = function(elapsedTime) {
  function updateParticle(i) {
    this.pool[3*i+2] += elapsedTime;
    if(this.pool[3*i+2] > 2000) this.start = i;
  }
  var i;
  if(this.wrapped) {
    for(i = 0; i < this.end; i++){
      updateParticle.call(this, i);
    }
    for(i = this.start; i < this.max; i++){
      updateParticle.call(this, i);
    }
  } else {
    for(i = this.start; i < this.end; i++) {
      updateParticle.call(this, i);
    }
  }
}

/**
 * @function render
 * Renders all bullets in our array.
 * @param {DOMHighResTimeStamp} elapsedTime
 * @param {CanvasRenderingContext2D} ctx
 */
SmokeParticles.prototype.render = function(elapsedTime, ctx) {
  function renderParticle(i){
    var alpha = 1 - (this.pool[3*i+2] / 1000);
    var radius = 0.1 * this.pool[3*i+2];
    if(radius > 5) radius = 5;
    ctx.beginPath();
    ctx.arc(
      this.pool[3*i],   // X position
      this.pool[3*i+1], // y position
      radius, // radius
      0,
      2*Math.PI
    );
    ctx.fillStyle = 'rgba(160, 160, 160,' + alpha + ')';
    ctx.fill();
  }

  // Render the particles individually
  var i;
  if(this.wrapped) {
    for(i = 0; i < this.end; i++){
      renderParticle.call(this, i);
    }
    for(i = this.start; i < this.max; i++){
      renderParticle.call(this, i);
    }
  } else {
    for(i = this.start; i < this.end; i++) {
      renderParticle.call(this, i);
    }
  }
}

},{}],8:[function(require,module,exports){
/**
 * @module
 * Tilemap engine defined using the Module pattern
 */
module.exports = exports = Tilemap;

/**
 * @constructor Tilemap
 * Creates a tilemap from JSON data conforming to
 * the Tiled JSON format using CSV data storage
 * @param {Object} mapData - JSON map data
 * @param {Ojbect} options - options for the tilemap.
 * Valid options are:
 *  onload - a callback triggered after all images are loaded
 */
function Tilemap(mapData, options) {
  var loading = 0;

  // Map properties
  this.tileWidth = mapData.tilewidth;
  this.tileHeight = mapData.tileheight;
  this.mapWidth = mapData.width;
  this.mapHeight = mapData.height;

  // Bootstrap access to private variables
  var tiles = [];
  var tilesets = [];
  var layers = [];

  // Load the tileset(s)
  loading = mapData.tilesets.length;
  mapData.tilesets.forEach( function(tilesetmapData, index) {
    // Load the tileset image
    var tileset = new Image();
    tileset.onload = function() {
      loading--;
      if(loading == 0 && options.onload) options.onload();
    }
    tileset.src = tilesetmapData.image;
    tilesets.push(tileset);

    // Create the tileset's tiles
    var colCount = Math.floor(tilesetmapData.imagewidth / mapData.tilewidth),
        rowCount = Math.floor(tilesetmapData.imageheight / mapData.tileheight),
        tileCount = colCount * rowCount;

    for(i = 0; i < tileCount; i++) {
      var tile = {
        // Reference to the image, shared amongst all tiles in the tileset
        image: tileset,
        // Source x position.  i % colCount == col number (as we remove full rows)
        sx: (i % colCount) * mapData.tilewidth,
        // Source y position. i / colWidth (integer division) == row number
        sy: Math.floor(i / colCount) * mapData.tileheight,
        // Indicates a solid tile (i.e. solid property is true).  As properties
        // can be left blank, we need to make sure the property exists.
        // We'll assume any tiles missing the solid property are *not* solid
        solid: (tilesetmapData.tileproperties[i] && tilesetmapData.tileproperties[i].solid == "true") ? true : false,
        movement: tilesetmapData.tileproperties[i].movement
      }
      tiles.push(tile);
    }
  });

  // Parse the layers in the map
  mapData.layers.forEach( function(layerData) {

    // Tile layers need to be stored in the engine for later
    // rendering
    if(layerData.type == "tilelayer") {
      // Create a layer object to represent this tile layer
      var layer = {
        name: layerData.name,
        width: layerData.width,
        height: layerData.height,
        visible: layerData.visible
      }

      // Set up the layer's data array.  We'll try to optimize
      // by keeping the index data type as small as possible
      if(tiles.length < Math.pow(2,8))
        layer.data = new Uint8Array(layerData.data);
      else if (tiles.length < Math.Pow(2, 16))
        layer.data = new Uint16Array(layerData.data);
      else
        layer.data = new Uint32Array(layerData.data);

      // save the tile layer
      layers.push(layer);
    }
  });

  this.tiles = tiles;
  this.tilesets = tilesets;
  this.layers = layers;
}


/**
 * @function render()
 * Renders the tilemap using the provide context
 * @param {Canvas2DContext} ctx - the rendering context
 */
Tilemap.prototype.render = function(ctx) {
  var tileWidth = this.tileWidth;
      tileHeight = this.tileHeight;
      tiles = this.tiles;

  // Render tilemap layers - note this assumes
  // layers are sorted back-to-front so foreground
  // layers obscure background ones.
  // see http://en.wikipedia.org/wiki/Painter%27s_algorithm
  this.layers.forEach(function(layer){

    // Only draw layers that are currently visible
    if(layer.visible) {
      for(y = 0; y < layer.height; y++) {
        for(x = 0; x < layer.width; x++) {
          var tileId = layer.data[x + layer.width * y];

          // tiles with an id of 0 don't exist
          if(tileId != 0) {
            var tile = tiles[tileId - 1];
            if(tile.image) { // Make sure the image has loaded
              ctx.drawImage(
                tile.image,     // The image to draw
                tile.sx, tile.sy, tileWidth, tileHeight, // The portion of image to draw
                x*tileWidth, y*tileHeight, tileWidth, tileHeight // Where to draw the image on-screen
              );
            }
          }

        }
      }
    }

  });
}

/**
 * @function tileAt()
 * returns the tile at the specified location and layer,
 * or undefined if no such tile exists.
 * @param {Integer} x - the x coordinate of the tile
 * @param {Integer} y - the y coordinate of the tile
 * @param {Integer} layer - the layer of the tile
 * @return The tile object, or undefined if no tile exists.
 */
Tilemap.prototype.tileAt = function(x, y, layer) {
  // sanity check
  if(layer < 0 || x < 0 || y < 0 ||
     layer >= this.layers.length ||
     x > this.mapWidth ||
     y > this.mapHeight
  ) return undefined;
  return this.tiles[this.layers[layer].data[x + y * this.mapWidth] - 1];
}

/**
 * @function toWorldCoordinates
 * Converts a coordinate pair from tile coordinates to
 * world coordinates.
 * @param {Object} coords - an object with an x and y
 * property corresponding to a tile location in the map.
 * @return a simple object with x and y properties of the
 * location in pixel-based world coordinates.
 */
Tilemap.prototype.toWorldCoordinates = function(coords) {
  return {
    x: this.tileWidth * coords.x + this.tileWidth/2,
    y: this.tileHeight * coords.y + this.tileHeight/2
  }
}

/**
 * @function toMapCoordinates()
 * Converts pixel-based world coordinates to tile-based
 * map coordinates.
 * @param {Object} coords - an object with an x and y
 * property consisting of world coordinates.
 * @returns a simple object with an x and y property of
 * the corresponding tile coordinates.
 */
Tilemap.prototype.toMapCoordinates = function(coords) {
  return {
    x: parseInt(coords.x / this.tileWidth),
    y: parseInt(coords.y / this.tileHeight)
  }
}

/**
 * @function findPath
 * A tree-search algorithm implementation that finds a
 * path from the supplied start tile position to goal
 * tile position using the specified method.
 * @param {Object} start - an object with x and y coordinates
 * corresponding to a tile position in the map.
 * @param {Object} goal - an object with x and y coordinates
 * corresponding to a tile position within the map.
 * @method {String} method - one of the following tree-search
 * approaches: 'breadth-first', 'greedy', 'best-first', and
 * 'a-star'.
 * @return a path as an array of coordinate objects corresponding
 * to tile positions, or an empty array if no path exists.
 */
Tilemap.prototype.findPath = function(start, goal, method) {
  var tilemap = this;
  start.cost = 0;
  var frontier = [[start]];
  var explored = [start];

  // Helper function to find nodes in the explored region
  function isExplored(node) {
    return explored.findIndex(function(n){
      return n.x == node.x && n.y == node.y;
    }) != -1;
  }

  // Helper function to determine if a node is impassible
  // (either by being solid or by being off the map)
  function isImpassible(node) {
    var tile = tilemap.tileAt(node.x, node.y, 0);
    return !(tile && tile.movement != -1);
  }

  // Helper function to return neighboring unexplored nodes
  function expand(node) {
    var actions = [];
    for(var x = -1; x < 2; x++){
      for(var y = -1; y < 2; y++){
        var newNode = {
          x: node.x - x,
          y: node.y - y
        }
        if((x != 0 || y != 0) &&
          !isExplored(newNode) &&
          !isImpassible(newNode))
        {
          // Add the path distance to reach this node
          var movement = tilemap.tileAt(node.x, node.y, 0).movement;
          newNode.cost = movement + node.cost;

          // Add the estimated distance to the goal
          // We'll use straight-line distance
          newNode.distance = Math.sqrt(
            Math.pow(newNode.x - goal.x, 2) +
            Math.pow(newNode.y - goal.y, 2)
          );

          // push the new node to action and explored lists
          actions.push(newNode);
          explored.push(newNode);
        }
      }
    }
    return actions;
  }

  // Tree search
  while(true) {
    // If there is no paths left in the frontier,
    // we cannot reach our goal
    if(frontier.length == 0) return [];

    // Select a path from the frontier to explore
    // The method of selection is very important
    var path;
    switch(method) {
      case 'breadth-first':
        // In breadth-first, we process the paths
        // in the order they were added to the frontier
        path = frontier.shift();
        break;
      case 'best-first':
        frontier.sort(function(pathA, pathB){
          var a = distanceToGoal(pathA[pathA.length-1]);
          var b = distanceToGoal(pathB[pathB.length-1]);
          return a - b;
        });
        path = frontier.shift();
        break;
      case 'greedy':
        frontier.sort(function(pathA, pathB){
          var a = pathA[pathA.length-1].cost;
          var b = pathB[pathB.length-1].cost;
          return a - b;
        });
        path = frontier.shift();
        break;
      case 'a-star':
        frontier.sort(function(pathA, pathB){
          var a = pathA[pathA.length-1].cost + pathA[pathA.length-1].distance;
          var b = pathB[pathB.length-1].cost + pathB[pathB.length-1].distance;
          return a - b;
        });
        path = frontier.shift();
        break;
    }

    // If the path we chose leads to the goal,
    // we found a solution; return it.
    var lastNode = path[path.length-1];
    if(lastNode.x == goal.x && lastNode.y == goal.y) {
      return path;
    }

    // Otherwise, add any new nodes not already explored
    // to the frontier
    expand(lastNode, lastNode).forEach(function(node){
      var newPath = path.slice()
      newPath.push(node)
      frontier.push(newPath);
    });
  }

  // If we get to this point, there is no workable path
  return [];
}
},{}],9:[function(require,module,exports){
"use strict";

/**
 * @module Vector
 * A library of vector functions.
 */
module.exports = exports = {
  add: add,
  subtract: subtract,
  scale: scale,
  rotate: rotate,
  dotProduct: dotProduct,
  magnitude: magnitude,
  normalize: normalize
}


/**
 * @function rotate
 * Scales a vector
 * @param {Vector} a - the vector to scale
 * @param {float} scale - the scalar to multiply the vector by
 * @returns a new vector representing the scaled original
 */
function scale(a, scale) {
 return {x: a.x * scale, y: a.y * scale};
}

/**
 * @function add
 * Computes the sum of two vectors
 * @param {Vector} a the first vector
 * @param {Vector} b the second vector
 * @return the computed sum
*/
function add(a, b) {
 return {x: a.x + b.x, y: a.y + b.y};
}

/**
 * @function subtract
 * Computes the difference of two vectors
 * @param {Vector} a the first vector
 * @param {Vector} b the second vector
 * @return the computed difference
 */
function subtract(a, b) {
  return {x: a.x - b.x, y: a.y - b.y};
}

/**
 * @function rotate
 * Rotates a vector about the Z-axis
 * @param {Vector} a - the vector to rotate
 * @param {float} angle - the angle to roatate by (in radians)
 * @returns a new vector representing the rotated original
 */
function rotate(a, angle) {
  return {
    x: a.x * Math.cos(angle) - a.y * Math.sin(angle),
    y: a.x * Math.sin(angle) + a.y * Math.cos(angle)
  }
}

/**
 * @function dotProduct
 * Computes the dot product of two vectors
 * @param {Vector} a the first vector
 * @param {Vector} b the second vector
 * @return the computed dot product
 */
function dotProduct(a, b) {
  return a.x * b.x + a.y * b.y
}

/**
 * @function magnitude
 * Computes the magnitude of a vector
 * @param {Vector} a the vector
 * @returns the calculated magnitude
 */
function magnitude(a) {
  return Math.sqrt(a.x * a.x + a.y * a.y);
}

/**
 * @function normalize
 * Normalizes the vector
 * @param {Vector} a the vector to normalize
 * @returns a new vector that is the normalized original
 */
function normalize(a) {
  var mag = magnitude(a);
  return {x: a.x / mag, y: a.y / mag};
}

},{}],10:[function(require,module,exports){
module.exports={ "height":100,
 "layers":[
        {
         "data":[34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 89, 89, 63, 64, 65, 66, 66, 34, 31, 32, 33, 34, 12, 12, 12, 12, 89, 89, 34, 34, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 34, 34, 34, 34, 176, 177, 178, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 89, 89, 73, 74, 75, 66, 66, 34, 41, 42, 43, 34, 12, 12, 12, 12, 89, 89, 34, 34, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 66, 66, 66, 66, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 34, 34, 34, 34, 186, 187, 188, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 89, 89, 83, 84, 85, 66, 66, 34, 51, 52, 53, 34, 12, 12, 12, 12, 89, 89, 34, 34, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 176, 177, 178, 66, 66, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 66, 66, 66, 66, 66, 66, 66, 34, 34, 176, 177, 178, 34, 34, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 34, 34, 34, 34, 196, 197, 198, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 89, 89, 66, 66, 1, 2, 3, 34, 34, 34, 34, 34, 34, 34, 34, 12, 89, 89, 34, 34, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 186, 187, 188, 66, 66, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 66, 66, 66, 66, 66, 66, 66, 34, 34, 186, 187, 188, 34, 34, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 66, 89, 89, 66, 66, 11, 12, 13, 34, 12, 12, 12, 34, 44, 45, 34, 12, 89, 89, 34, 34, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 196, 197, 198, 66, 66, 66, 66, 66, 34, 34, 176, 177, 178, 34, 34, 66, 66, 66, 66, 66, 66, 66, 34, 34, 196, 197, 198, 34, 34, 66, 34, 34, 34, 34, 34, 34, 34, 34, 31, 32, 33, 34, 12, 12, 12, 12, 89, 89, 34, 34, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 66, 89, 89, 66, 66, 21, 22, 23, 34, 12, 12, 12, 34, 54, 55, 34, 12, 89, 89, 34, 34, 66, 66, 34, 34, 34, 34, 34, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 186, 187, 188, 34, 34, 66, 66, 66, 66, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 66, 34, 34, 34, 34, 34, 34, 34, 34, 41, 42, 43, 34, 12, 12, 12, 12, 89, 89, 34, 34, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 66, 66, 66, 89, 89, 66, 66, 66, 66, 66, 34, 12, 12, 12, 34, 34, 34, 34, 12, 89, 89, 34, 34, 66, 66, 176, 177, 178, 34, 34, 66, 63, 64, 65, 66, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 196, 197, 198, 34, 34, 66, 66, 66, 66, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 66, 34, 34, 176, 177, 178, 34, 34, 34, 51, 52, 53, 34, 12, 12, 12, 12, 89, 89, 34, 34, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 63, 64, 65, 66, 66, 89, 89, 66, 12, 12, 34, 12, 12, 12, 12, 12, 12, 12, 12, 89, 89, 34, 34, 66, 66, 186, 187, 188, 34, 34, 66, 73, 74, 75, 66, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 186, 187, 188, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 89, 89, 34, 34, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 73, 74, 75, 66, 66, 89, 89, 66, 12, 12, 31, 32, 33, 89, 89, 89, 89, 89, 89, 89, 89, 34, 34, 66, 66, 196, 197, 198, 34, 34, 66, 83, 84, 85, 66, 34, 34, 34, 34, 34, 66, 66, 66, 66, 34, 34, 34, 34, 34, 34, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 196, 197, 198, 34, 34, 34, 12, 12, 12, 34, 44, 45, 34, 12, 89, 89, 34, 34, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 83, 84, 85, 66, 66, 89, 89, 66, 12, 12, 41, 42, 43, 89, 89, 89, 89, 89, 89, 89, 89, 34, 34, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 34, 34, 34, 66, 46, 47, 66, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 66, 66, 66, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 34, 54, 55, 34, 12, 89, 89, 34, 34, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 66, 66, 1, 2, 3, 89, 89, 66, 12, 12, 51, 52, 53, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 66, 66, 34, 34, 34, 34, 66, 66, 66, 66, 66, 66, 34, 34, 34, 66, 66, 66, 56, 57, 66, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 66, 66, 66, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 34, 34, 34, 34, 12, 89, 89, 34, 34, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 66, 66, 11, 12, 13, 89, 89, 66, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 66, 66, 34, 44, 45, 34, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 176, 177, 178, 34, 34, 66, 66, 66, 66, 66, 34, 12, 12, 12, 12, 12, 12, 12, 12, 89, 89, 34, 34, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 66, 66, 21, 22, 23, 89, 89, 66, 12, 12, 63, 64, 65, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 34, 54, 55, 34, 66, 66, 66, 66, 66, 34, 34, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 186, 187, 188, 34, 34, 66, 66, 66, 66, 66, 31, 32, 33, 89, 89, 89, 89, 89, 89, 89, 89, 34, 34, 12, 12, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 89, 89, 66, 12, 12, 73, 74, 75, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 66, 34, 34, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 89, 89, 89, 63, 64, 65, 66, 66, 12, 12, 12, 66, 34, 34, 196, 197, 198, 34, 34, 66, 66, 66, 66, 66, 41, 42, 43, 89, 89, 89, 89, 89, 89, 89, 89, 34, 34, 12, 12, 66, 66, 66, 66, 66, 66, 12, 12, 63, 64, 65, 66, 66, 89, 89, 66, 66, 66, 66, 66, 66, 12, 12, 83, 84, 85, 66, 66, 66, 66, 66, 34, 34, 34, 34, 89, 89, 89, 89, 1, 2, 3, 34, 31, 32, 33, 66, 1, 2, 3, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 89, 89, 89, 73, 74, 75, 66, 66, 12, 12, 12, 66, 34, 34, 34, 34, 34, 34, 34, 66, 66, 66, 66, 66, 51, 52, 53, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 66, 66, 66, 66, 66, 12, 12, 73, 74, 75, 66, 66, 89, 89, 66, 66, 12, 12, 12, 12, 12, 12, 66, 66, 1, 2, 3, 66, 66, 66, 34, 44, 45, 34, 89, 89, 89, 89, 11, 12, 13, 34, 41, 42, 43, 66, 11, 12, 13, 66, 66, 66, 66, 66, 34, 34, 66, 66, 66, 66, 89, 89, 89, 83, 84, 85, 66, 66, 12, 12, 12, 66, 34, 34, 34, 34, 34, 34, 34, 66, 66, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 66, 66, 66, 66, 66, 12, 12, 83, 84, 85, 66, 66, 89, 89, 66, 66, 12, 12, 34, 34, 34, 34, 66, 66, 11, 12, 13, 66, 66, 66, 34, 54, 55, 34, 89, 89, 89, 89, 21, 22, 23, 34, 51, 52, 53, 66, 21, 22, 23, 66, 66, 66, 66, 66, 34, 34, 66, 66, 66, 66, 89, 89, 89, 66, 66, 1, 2, 3, 12, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 42, 12, 66, 66, 66, 66, 66, 66, 12, 12, 66, 66, 1, 2, 3, 89, 89, 66, 66, 12, 12, 34, 34, 34, 34, 66, 66, 21, 22, 23, 66, 66, 66, 34, 34, 34, 34, 89, 89, 89, 89, 89, 89, 89, 89, 89, 34, 34, 34, 34, 63, 64, 65, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 63, 64, 65, 66, 66, 11, 12, 13, 12, 12, 12, 34, 31, 32, 33, 34, 12, 12, 12, 12, 89, 89, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 66, 66, 66, 66, 66, 12, 12, 66, 66, 11, 12, 13, 89, 89, 66, 66, 12, 12, 34, 34, 34, 34, 66, 66, 66, 66, 66, 63, 64, 65, 63, 64, 65, 66, 66, 89, 89, 89, 89, 89, 89, 89, 89, 34, 44, 45, 34, 73, 74, 75, 66, 66, 66, 48, 49, 50, 78, 78, 78, 78, 73, 74, 75, 66, 66, 21, 22, 23, 12, 12, 12, 34, 41, 42, 43, 34, 12, 12, 12, 12, 89, 89, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 66, 66, 66, 66, 66, 12, 12, 66, 66, 21, 22, 23, 89, 89, 66, 66, 12, 12, 34, 34, 34, 34, 80, 80, 12, 12, 12, 73, 74, 75, 73, 74, 75, 66, 66, 89, 89, 89, 89, 89, 89, 89, 89, 34, 54, 55, 34, 83, 84, 85, 66, 66, 66, 58, 109, 60, 78, 78, 78, 78, 83, 84, 85, 66, 66, 66, 66, 66, 12, 12, 12, 34, 51, 52, 53, 34, 12, 12, 12, 12, 89, 89, 34, 34, 34, 34, 34, 34, 34, 176, 177, 178, 34, 34, 34, 34, 34, 12, 12, 66, 66, 66, 66, 66, 66, 12, 12, 66, 66, 66, 66, 66, 89, 89, 66, 66, 12, 12, 34, 34, 34, 34, 80, 80, 12, 12, 12, 83, 84, 85, 83, 84, 85, 66, 66, 89, 89, 89, 89, 89, 89, 89, 89, 34, 34, 34, 34, 66, 66, 1, 2, 3, 66, 68, 69, 70, 78, 78, 78, 78, 89, 89, 89, 1, 2, 3, 89, 89, 12, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 12, 89, 89, 34, 34, 34, 34, 34, 34, 34, 186, 187, 188, 34, 34, 34, 34, 34, 12, 12, 66, 89, 89, 63, 64, 65, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 12, 12, 34, 34, 34, 34, 80, 80, 12, 12, 12, 12, 12, 12, 66, 66, 1, 2, 3, 89, 89, 89, 89, 89, 89, 89, 89, 1, 2, 3, 89, 66, 66, 11, 12, 13, 66, 78, 78, 78, 78, 48, 49, 50, 89, 89, 89, 11, 12, 13, 89, 89, 12, 12, 12, 34, 12, 12, 12, 34, 44, 45, 34, 12, 89, 89, 34, 34, 34, 34, 34, 34, 34, 196, 197, 198, 34, 34, 34, 34, 34, 12, 12, 66, 89, 89, 73, 74, 75, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 12, 12, 34, 34, 34, 34, 80, 80, 12, 12, 12, 12, 12, 12, 66, 66, 11, 12, 13, 89, 34, 34, 34, 34, 89, 89, 89, 11, 12, 13, 89, 66, 66, 21, 22, 23, 66, 78, 78, 78, 78, 58, 109, 60, 89, 89, 89, 21, 22, 23, 89, 89, 12, 12, 12, 34, 12, 12, 12, 34, 54, 55, 34, 12, 89, 89, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 89, 89, 83, 84, 85, 66, 66, 66, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 34, 34, 34, 34, 80, 80, 12, 12, 12, 12, 12, 12, 66, 66, 21, 22, 23, 89, 34, 44, 45, 34, 89, 89, 89, 21, 22, 23, 89, 66, 66, 66, 66, 66, 66, 78, 78, 78, 78, 68, 69, 70, 89, 89, 89, 63, 64, 65, 66, 66, 12, 12, 12, 34, 12, 12, 12, 34, 34, 34, 34, 12, 89, 89, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 89, 89, 66, 66, 1, 2, 3, 66, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 80, 80, 12, 12, 12, 12, 12, 12, 66, 66, 66, 66, 66, 89, 34, 54, 55, 34, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 12, 89, 89, 89, 73, 74, 75, 66, 66, 12, 12, 12, 34, 12, 12, 12, 12, 12, 12, 12, 12, 89, 89, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 89, 89, 66, 66, 11, 12, 13, 66, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 80, 80, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 89, 34, 34, 34, 34, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 66, 66, 66, 66, 66, 89, 89, 89, 12, 89, 89, 89, 83, 84, 85, 66, 66, 12, 12, 12, 31, 32, 33, 89, 89, 89, 89, 89, 89, 89, 89, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 89, 89, 66, 66, 21, 22, 23, 66, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 80, 80, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 89, 63, 64, 65, 89, 89, 89, 89, 48, 49, 50, 34, 34, 34, 34, 66, 1, 2, 3, 66, 66, 89, 89, 89, 12, 89, 89, 89, 66, 66, 1, 2, 3, 12, 12, 12, 41, 42, 43, 89, 89, 89, 89, 89, 89, 89, 89, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 89, 89, 66, 66, 66, 66, 66, 66, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 80, 80, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 89, 73, 74, 75, 89, 89, 89, 89, 58, 109, 60, 34, 34, 34, 34, 66, 11, 12, 13, 66, 66, 66, 66, 66, 12, 89, 89, 89, 66, 66, 11, 12, 13, 12, 12, 12, 51, 52, 53, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 66, 66, 66, 66, 66, 66, 66, 66, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 89, 83, 84, 85, 89, 89, 89, 89, 68, 69, 70, 34, 34, 34, 34, 66, 21, 22, 23, 63, 64, 65, 66, 66, 12, 89, 89, 89, 66, 66, 21, 22, 23, 12, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 66, 66, 66, 66, 89, 89, 89, 66, 66, 66, 66, 73, 74, 75, 66, 66, 12, 89, 89, 89, 66, 66, 66, 66, 66, 12, 12, 12, 66, 89, 89, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 119, 116, 12, 79, 86, 87, 88, 46, 47, 89, 89, 66, 66, 66, 66, 83, 84, 85, 66, 66, 12, 89, 89, 89, 89, 89, 89, 89, 89, 12, 12, 12, 66, 89, 89, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 176, 177, 178, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 119, 116, 12, 79, 96, 97, 98, 56, 57, 89, 89, 66, 66, 66, 66, 66, 66, 1, 2, 3, 12, 12, 12, 12, 89, 63, 64, 65, 89, 12, 12, 12, 66, 89, 89, 66, 34, 34, 34, 34, 34, 34, 34, 176, 177, 178, 34, 34, 34, 34, 34, 34, 34, 34, 186, 187, 188, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 31, 32, 33, 34, 12, 12, 12, 12, 89, 89, 34, 34, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 119, 116, 12, 79, 106, 107, 108, 79, 79, 79, 89, 66, 66, 66, 66, 66, 66, 11, 12, 13, 12, 12, 12, 12, 89, 73, 74, 75, 89, 12, 12, 12, 66, 89, 89, 66, 34, 34, 34, 34, 34, 34, 34, 186, 187, 188, 34, 34, 34, 34, 34, 34, 34, 34, 196, 197, 198, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 41, 42, 43, 34, 12, 12, 12, 12, 89, 89, 34, 34, 12, 12, 12, 12, 12, 12, 12, 63, 64, 65, 12, 12, 12, 12, 12, 12, 12, 119, 116, 12, 79, 79, 79, 79, 79, 48, 49, 50, 66, 66, 66, 66, 66, 66, 21, 22, 23, 12, 12, 12, 12, 89, 83, 84, 85, 89, 12, 12, 12, 66, 89, 89, 66, 34, 34, 34, 34, 34, 34, 34, 196, 197, 198, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 51, 52, 53, 34, 12, 12, 12, 12, 89, 89, 34, 34, 12, 12, 12, 12, 12, 12, 12, 73, 74, 75, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 58, 109, 60, 66, 66, 66, 66, 66, 66, 66, 66, 66, 12, 12, 12, 12, 89, 89, 89, 89, 89, 12, 12, 12, 66, 89, 89, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 89, 89, 34, 34, 12, 12, 12, 12, 12, 12, 12, 83, 84, 85, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 68, 69, 70, 66, 66, 66, 66, 63, 64, 65, 66, 66, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 66, 89, 89, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 34, 44, 45, 34, 12, 89, 89, 34, 34, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 66, 66, 66, 66, 73, 74, 75, 66, 66, 12, 12, 12, 12, 66, 66, 66, 66, 66, 66, 66, 66, 66, 89, 89, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 34, 54, 55, 34, 12, 89, 89, 34, 34, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 66, 66, 66, 66, 83, 84, 85, 66, 12, 12, 12, 12, 12, 66, 66, 66, 66, 66, 66, 66, 66, 66, 89, 89, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 89, 89, 63, 64, 65, 66, 66, 34, 12, 12, 12, 34, 34, 34, 34, 12, 89, 89, 34, 34, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 66, 66, 66, 66, 66, 66, 66, 66, 12, 12, 12, 12, 12, 66, 66, 66, 66, 66, 66, 66, 66, 66, 89, 89, 66, 34, 34, 34, 176, 177, 178, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 89, 89, 73, 74, 75, 66, 66, 34, 12, 12, 12, 12, 12, 12, 12, 12, 89, 89, 34, 34, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 34, 186, 187, 188, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 89, 89, 83, 84, 85, 66, 66, 31, 32, 33, 89, 89, 89, 89, 89, 89, 89, 89, 34, 34, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 34, 196, 197, 198, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 89, 89, 66, 66, 1, 2, 3, 41, 42, 43, 89, 89, 89, 89, 89, 89, 89, 89, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 63, 64, 65, 66, 66, 89, 89, 66, 66, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 66, 89, 89, 66, 66, 11, 12, 13, 51, 52, 53, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 73, 74, 75, 66, 66, 89, 89, 66, 66, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 66, 89, 89, 66, 66, 21, 22, 23, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 83, 84, 85, 66, 66, 89, 89, 66, 66, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 66, 66, 66, 89, 89, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 1, 2, 3, 89, 89, 66, 66, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 63, 64, 65, 66, 66, 89, 89, 66, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 11, 12, 13, 89, 89, 66, 66, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 73, 74, 75, 66, 66, 89, 89, 66, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 66, 66, 21, 22, 23, 89, 89, 66, 66, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 83, 84, 85, 66, 66, 89, 89, 66, 12, 12, 12, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 89, 89, 89, 89, 89, 89, 89, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 66, 66, 1, 2, 3, 89, 89, 66, 12, 12, 12, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 35, 35, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 35, 35, 89, 89, 89, 89, 89, 89, 89, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 66, 66, 11, 12, 13, 89, 89, 66, 12, 12, 12, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 31, 32, 33, 34, 12, 12, 12, 12, 89, 89, 34, 34, 34, 34, 34, 12, 12, 35, 35, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 35, 35, 66, 66, 66, 66, 66, 66, 66, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 66, 66, 21, 22, 23, 89, 89, 66, 12, 12, 12, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 176, 177, 178, 34, 34, 34, 41, 42, 43, 34, 12, 12, 12, 12, 89, 89, 34, 34, 34, 34, 34, 12, 12, 35, 35, 66, 66, 48, 49, 50, 78, 78, 78, 78, 66, 66, 35, 35, 66, 66, 66, 66, 66, 66, 66, 12, 12, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 89, 89, 66, 12, 12, 12, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 186, 187, 188, 34, 34, 34, 51, 52, 53, 34, 12, 12, 12, 12, 89, 89, 34, 34, 34, 34, 34, 12, 12, 35, 35, 66, 66, 58, 109, 60, 78, 78, 78, 78, 66, 66, 35, 35, 66, 66, 66, 66, 66, 66, 66, 12, 12, 66, 66, 66, 66, 66, 66, 12, 12, 63, 64, 65, 66, 66, 89, 89, 66, 66, 66, 66, 66, 66, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 196, 197, 198, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 89, 89, 34, 34, 34, 34, 34, 12, 12, 35, 35, 66, 66, 68, 69, 70, 78, 78, 78, 78, 66, 66, 35, 35, 66, 66, 66, 66, 66, 66, 66, 12, 12, 66, 66, 66, 66, 66, 66, 12, 12, 73, 74, 75, 66, 66, 89, 89, 66, 66, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 34, 44, 45, 34, 12, 89, 89, 34, 34, 34, 34, 34, 12, 12, 35, 35, 66, 66, 78, 78, 78, 78, 48, 49, 50, 66, 66, 35, 35, 66, 66, 66, 66, 66, 66, 66, 12, 12, 66, 66, 66, 66, 66, 66, 12, 12, 83, 84, 85, 66, 66, 89, 89, 66, 66, 12, 12, 34, 34, 34, 34, 42, 42, 66, 66, 66, 66, 66, 66, 66, 66, 12, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 34, 54, 55, 34, 12, 89, 89, 34, 34, 34, 34, 34, 12, 12, 35, 35, 66, 66, 78, 78, 78, 78, 58, 109, 60, 66, 66, 35, 35, 66, 66, 66, 66, 66, 66, 66, 12, 12, 66, 66, 66, 66, 66, 66, 12, 12, 66, 66, 1, 2, 3, 89, 89, 66, 66, 12, 12, 34, 34, 34, 34, 42, 42, 66, 66, 66, 66, 66, 66, 66, 66, 12, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 34, 34, 34, 34, 12, 89, 89, 34, 34, 34, 34, 34, 12, 12, 35, 35, 66, 66, 78, 78, 78, 78, 68, 69, 70, 66, 66, 35, 35, 66, 66, 66, 66, 66, 66, 66, 12, 12, 66, 66, 66, 66, 66, 66, 12, 12, 66, 66, 11, 12, 13, 89, 89, 66, 66, 12, 12, 34, 34, 34, 34, 42, 42, 66, 66, 66, 66, 66, 66, 66, 66, 12, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 12, 12, 12, 12, 12, 89, 89, 34, 34, 34, 34, 34, 12, 12, 35, 35, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 35, 35, 66, 66, 66, 66, 66, 66, 66, 12, 12, 66, 66, 66, 66, 66, 66, 12, 12, 66, 66, 21, 22, 23, 89, 89, 66, 66, 12, 12, 34, 34, 34, 34, 42, 42, 66, 66, 66, 66, 66, 66, 66, 66, 12, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 176, 177, 178, 34, 34, 31, 32, 33, 89, 89, 89, 89, 89, 89, 89, 89, 34, 34, 34, 34, 34, 12, 12, 35, 35, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 35, 35, 66, 66, 66, 66, 66, 66, 66, 12, 12, 66, 66, 66, 66, 66, 66, 12, 12, 66, 66, 66, 66, 66, 89, 89, 66, 66, 12, 12, 34, 34, 34, 34, 42, 42, 66, 66, 66, 66, 66, 66, 66, 66, 12, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 186, 187, 188, 34, 34, 41, 42, 43, 89, 89, 89, 89, 89, 89, 89, 89, 34, 34, 34, 34, 34, 12, 12, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 89, 89, 89, 89, 89, 89, 89, 12, 12, 66, 89, 89, 63, 64, 65, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 12, 12, 34, 34, 34, 34, 42, 42, 66, 66, 66, 66, 66, 66, 66, 66, 12, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 196, 197, 198, 34, 34, 51, 52, 53, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 89, 89, 89, 89, 89, 89, 89, 12, 12, 66, 89, 89, 73, 74, 75, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 12, 12, 34, 34, 34, 34, 42, 42, 66, 66, 66, 66, 66, 66, 66, 66, 12, 12, 12, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 66, 66, 66, 66, 66, 66, 66, 12, 12, 66, 89, 89, 83, 84, 85, 66, 66, 66, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 34, 34, 34, 34, 42, 42, 66, 66, 66, 66, 66, 66, 66, 66, 12, 12, 12, 34, 34, 34, 34, 34, 34, 34, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 66, 66, 66, 66, 66, 66, 66, 12, 12, 66, 89, 89, 66, 66, 1, 2, 3, 66, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 34, 34, 34, 34, 34, 34, 34, 66, 34, 34, 34, 34, 34, 34, 34, 48, 49, 50, 78, 78, 78, 78, 34, 34, 34, 34, 34, 34, 34, 63, 64, 65, 66, 66, 89, 89, 66, 66, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 66, 66, 66, 66, 66, 66, 66, 12, 12, 66, 89, 89, 66, 66, 11, 12, 13, 66, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 12, 12, 48, 49, 50, 78, 78, 78, 78, 12, 34, 34, 176, 177, 178, 34, 34, 66, 34, 34, 176, 177, 178, 34, 34, 58, 109, 60, 78, 78, 78, 78, 34, 34, 176, 177, 178, 34, 34, 73, 74, 75, 66, 66, 89, 89, 66, 66, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 66, 66, 66, 66, 66, 66, 66, 12, 12, 66, 89, 89, 66, 66, 21, 22, 23, 66, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 12, 12, 58, 109, 60, 78, 78, 78, 78, 12, 34, 34, 186, 187, 188, 34, 34, 66, 34, 34, 186, 187, 188, 34, 34, 68, 69, 70, 78, 78, 78, 78, 34, 34, 186, 187, 188, 34, 34, 83, 84, 85, 66, 66, 89, 89, 66, 66, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 66, 66, 66, 66, 66, 66, 66, 12, 12, 66, 89, 89, 66, 66, 66, 66, 66, 66, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 12, 12, 68, 69, 70, 78, 78, 78, 78, 12, 34, 34, 196, 197, 198, 34, 34, 66, 34, 34, 196, 197, 198, 34, 34, 78, 78, 78, 78, 48, 49, 50, 34, 34, 196, 197, 198, 34, 34, 66, 66, 1, 2, 3, 89, 89, 66, 66, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 66, 66, 66, 66, 66, 66, 66, 12, 12, 66, 66, 66, 66, 66, 66, 66, 66, 66, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 12, 12, 78, 78, 78, 78, 48, 49, 50, 12, 34, 34, 34, 34, 34, 34, 34, 66, 34, 34, 34, 34, 34, 34, 34, 78, 78, 78, 78, 58, 109, 60, 34, 34, 34, 34, 34, 34, 34, 66, 66, 11, 12, 13, 89, 89, 66, 66, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 66, 66, 66, 66, 66, 66, 66, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 78, 78, 78, 78, 58, 109, 60, 12, 34, 34, 34, 34, 34, 34, 34, 66, 34, 34, 34, 34, 34, 34, 34, 78, 78, 78, 78, 68, 69, 70, 34, 34, 34, 34, 34, 34, 34, 66, 66, 21, 22, 23, 89, 89, 66, 66, 66, 66, 66, 66, 66, 66, 66, 48, 49, 50, 78, 78, 78, 78, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 78, 78, 78, 78, 68, 69, 70, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 89, 89, 63, 64, 65, 66, 66, 63, 64, 65, 66, 66, 63, 64, 65, 66, 66, 89, 89, 66, 66, 12, 12, 12, 12, 66, 66, 58, 109, 60, 78, 78, 78, 78, 66, 66, 66, 66, 66, 66, 89, 89, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 89, 89, 63, 64, 65, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 89, 89, 73, 74, 75, 66, 66, 73, 74, 75, 66, 66, 73, 74, 75, 66, 66, 89, 89, 66, 66, 12, 12, 12, 12, 66, 66, 68, 69, 70, 78, 78, 78, 78, 66, 66, 66, 66, 66, 66, 89, 89, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 89, 89, 73, 74, 75, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 89, 89, 83, 84, 85, 66, 66, 83, 84, 85, 66, 66, 83, 84, 85, 66, 66, 89, 89, 66, 66, 12, 12, 12, 12, 66, 66, 78, 78, 78, 78, 48, 49, 50, 66, 66, 66, 66, 66, 66, 89, 89, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 89, 89, 83, 84, 85, 66, 66, 66, 66, 63, 64, 65, 12, 12, 12, 12, 12, 12, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 89, 89, 66, 66, 1, 2, 3, 66, 66, 1, 2, 3, 66, 66, 1, 2, 3, 89, 89, 66, 66, 12, 12, 12, 12, 66, 66, 78, 78, 78, 78, 58, 109, 60, 66, 66, 66, 66, 66, 66, 89, 89, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 89, 89, 66, 66, 1, 2, 3, 66, 66, 73, 74, 75, 12, 12, 12, 12, 12, 12, 66, 66, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 66, 89, 89, 66, 66, 11, 12, 13, 66, 66, 11, 12, 13, 66, 66, 11, 12, 13, 89, 89, 66, 66, 12, 12, 12, 12, 66, 66, 78, 78, 78, 78, 68, 69, 70, 66, 66, 66, 66, 66, 66, 89, 89, 66, 66, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 66, 89, 89, 66, 66, 11, 12, 13, 66, 66, 83, 84, 85, 12, 12, 12, 12, 12, 12, 66, 66, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 66, 89, 89, 66, 66, 21, 22, 23, 66, 66, 21, 22, 23, 66, 66, 21, 22, 23, 89, 89, 66, 66, 12, 12, 12, 12, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 63, 64, 65, 66, 66, 89, 89, 66, 66, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 66, 89, 89, 66, 66, 21, 22, 23, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 66, 66, 66, 89, 89, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 73, 74, 75, 66, 66, 89, 89, 66, 66, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 66, 66, 66, 89, 89, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 63, 64, 65, 66, 66, 89, 89, 66, 12, 12, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 83, 84, 85, 66, 66, 89, 89, 66, 66, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 63, 64, 65, 66, 66, 89, 89, 66, 12, 12, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 73, 74, 75, 66, 66, 89, 89, 66, 12, 12, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 66, 66, 1, 2, 3, 89, 89, 66, 66, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 73, 74, 75, 66, 66, 89, 89, 66, 12, 12, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 83, 84, 85, 66, 66, 89, 89, 66, 12, 12, 66, 66, 66, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 66, 66, 11, 12, 13, 89, 89, 66, 66, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 83, 84, 85, 66, 66, 89, 89, 66, 12, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 66, 66, 1, 2, 3, 89, 89, 66, 12, 12, 66, 66, 66, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 66, 66, 21, 22, 23, 89, 89, 66, 66, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 66, 66, 1, 2, 3, 89, 89, 66, 12, 12, 42, 42, 42, 42, 42, 63, 64, 65, 42, 42, 42, 42, 42, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 66, 66, 11, 12, 13, 89, 89, 66, 12, 12, 66, 66, 66, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 66, 66, 66, 34, 34, 34, 176, 177, 178, 34, 34, 34, 63, 64, 65, 66, 66, 89, 89, 66, 66, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 66, 66, 11, 12, 13, 89, 89, 66, 12, 12, 42, 42, 42, 42, 42, 73, 74, 75, 42, 42, 42, 42, 42, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 66, 66, 21, 22, 23, 89, 89, 66, 12, 12, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 34, 186, 187, 188, 34, 34, 34, 73, 74, 75, 66, 66, 89, 89, 66, 66, 12, 12, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 89, 66, 66, 66, 21, 22, 23, 89, 89, 66, 12, 12, 42, 42, 42, 42, 42, 83, 84, 85, 42, 42, 42, 42, 42, 12, 12, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 89, 89, 66, 12, 12, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 34, 196, 197, 198, 34, 34, 34, 83, 84, 85, 66, 66, 89, 89, 66, 66, 12, 12, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 89, 89, 66, 12, 12, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 12, 12, 66, 66, 66, 66, 66, 66, 12, 12, 63, 64, 65, 66, 66, 89, 89, 66, 66, 66, 66, 66, 66, 12, 12, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 34, 34, 34, 34, 34, 34, 34, 34, 34, 66, 66, 1, 2, 3, 89, 89, 66, 66, 12, 12, 66, 66, 66, 66, 66, 66, 12, 12, 63, 64, 65, 66, 66, 89, 89, 66, 66, 66, 66, 66, 66, 12, 12, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 12, 12, 66, 66, 66, 66, 66, 66, 12, 12, 73, 74, 75, 66, 66, 89, 89, 66, 66, 12, 12, 12, 12, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 66, 66, 11, 12, 13, 89, 89, 66, 66, 12, 12, 66, 66, 66, 66, 66, 66, 12, 12, 73, 74, 75, 66, 66, 89, 89, 66, 66, 12, 12, 12, 12, 12, 12, 42, 42, 42, 42, 42, 42, 42, 42, 63, 64, 65, 42, 42, 12, 12, 66, 66, 66, 66, 66, 66, 12, 12, 83, 84, 85, 66, 66, 89, 89, 66, 66, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 66, 66, 21, 22, 23, 89, 89, 66, 66, 12, 12, 66, 66, 66, 66, 66, 66, 12, 12, 83, 84, 85, 66, 66, 89, 89, 66, 66, 12, 12, 34, 34, 34, 34, 42, 42, 42, 42, 42, 42, 42, 42, 73, 74, 75, 42, 42, 12, 12, 66, 66, 66, 66, 66, 66, 12, 12, 66, 66, 1, 2, 3, 89, 89, 66, 66, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 66, 66, 66, 66, 66, 66, 12, 12, 66, 66, 1, 2, 3, 89, 89, 66, 66, 12, 12, 34, 34, 34, 34, 42, 42, 42, 42, 42, 42, 42, 42, 83, 84, 85, 42, 42, 12, 12, 66, 66, 66, 66, 66, 66, 12, 12, 66, 66, 11, 12, 13, 89, 89, 66, 66, 12, 12, 34, 34, 34, 34, 34, 34, 176, 177, 178, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 66, 66, 66, 66, 66, 66, 12, 12, 66, 66, 11, 12, 13, 89, 89, 66, 66, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 66, 66, 66, 66, 66, 12, 12, 66, 66, 21, 22, 23, 89, 89, 66, 66, 12, 12, 34, 34, 34, 34, 34, 34, 186, 187, 188, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 66, 66, 66, 66, 66, 12, 12, 66, 66, 21, 22, 23, 89, 89, 66, 66, 12, 12, 34, 34, 34, 34, 34, 31, 32, 33, 34, 12, 12, 12, 12, 89, 89, 34, 34, 12, 12, 66, 66, 66, 66, 66, 66, 12, 12, 66, 66, 66, 66, 66, 89, 89, 66, 66, 12, 12, 34, 34, 34, 34, 34, 34, 196, 197, 198, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 66, 66, 66, 66, 66, 12, 12, 66, 66, 66, 66, 66, 89, 89, 66, 66, 12, 12, 34, 34, 34, 34, 34, 41, 42, 43, 34, 12, 12, 12, 12, 89, 89, 34, 34, 12, 12, 66, 89, 89, 63, 64, 65, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 66, 89, 89, 63, 64, 65, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 12, 12, 34, 34, 34, 34, 34, 51, 52, 53, 34, 12, 12, 12, 12, 89, 89, 34, 34, 12, 12, 66, 89, 89, 73, 74, 75, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 66, 66, 66, 66, 66, 42, 42, 48, 49, 50, 78, 78, 78, 78, 42, 42, 66, 66, 66, 66, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 66, 89, 89, 73, 74, 75, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 66, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 89, 89, 34, 34, 12, 12, 66, 89, 89, 83, 84, 85, 66, 66, 66, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 66, 66, 66, 66, 66, 42, 42, 58, 109, 60, 78, 78, 78, 78, 42, 42, 66, 66, 66, 66, 63, 64, 65, 66, 66, 89, 89, 66, 66, 34, 12, 12, 66, 89, 89, 83, 84, 85, 66, 66, 66, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 34, 34, 34, 34, 34, 12, 12, 12, 34, 44, 45, 34, 12, 89, 89, 34, 34, 12, 12, 66, 89, 89, 66, 66, 1, 2, 3, 66, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 66, 66, 66, 66, 66, 42, 42, 68, 69, 70, 78, 78, 78, 78, 42, 42, 66, 66, 66, 66, 73, 74, 75, 66, 66, 89, 89, 66, 66, 34, 12, 12, 66, 89, 89, 66, 66, 1, 2, 3, 66, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 34, 54, 55, 34, 12, 89, 89, 34, 34, 12, 12, 66, 89, 89, 66, 66, 11, 12, 13, 66, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 176, 177, 178, 34, 34, 66, 66, 66, 66, 66, 42, 42, 78, 78, 78, 78, 48, 49, 50, 42, 42, 66, 66, 66, 66, 83, 84, 85, 66, 66, 89, 89, 66, 66, 34, 12, 12, 66, 89, 89, 66, 66, 11, 12, 13, 66, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 34, 34, 34, 34, 12, 89, 89, 34, 34, 12, 12, 66, 89, 89, 66, 66, 21, 22, 23, 66, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 186, 187, 188, 34, 34, 66, 66, 66, 66, 66, 42, 42, 78, 78, 78, 78, 58, 109, 60, 42, 42, 66, 66, 66, 66, 66, 66, 1, 2, 3, 89, 89, 66, 66, 34, 12, 12, 66, 89, 89, 66, 66, 21, 22, 23, 66, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 12, 12, 12, 12, 12, 89, 89, 34, 34, 12, 12, 66, 89, 89, 66, 66, 66, 66, 66, 66, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 196, 197, 198, 34, 34, 66, 66, 66, 66, 66, 42, 42, 78, 78, 78, 78, 68, 69, 70, 42, 42, 66, 66, 66, 66, 66, 66, 11, 12, 13, 89, 89, 66, 66, 34, 12, 12, 66, 89, 89, 66, 66, 66, 66, 66, 66, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 31, 32, 33, 89, 89, 89, 89, 89, 89, 89, 89, 34, 34, 12, 12, 66, 66, 66, 66, 66, 66, 66, 66, 66, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 66, 66, 66, 66, 66, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 66, 66, 66, 66, 66, 66, 21, 22, 23, 89, 89, 66, 66, 34, 12, 12, 66, 66, 66, 66, 66, 66, 66, 66, 66, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 41, 42, 43, 89, 89, 89, 89, 89, 89, 89, 89, 34, 34, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 34, 34, 34, 34, 34, 34, 34, 66, 66, 66, 66, 66, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 42, 66, 66, 66, 66, 12, 12, 12, 12, 12, 12, 12, 12, 12, 34, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 51, 52, 53, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34],
         "height":100,
         "name":"Tile Layer 1",
         "opacity":1,
         "type":"tilelayer",
         "visible":true,
         "width":100,
         "x":0,
         "y":0
        }],
 "nextobjectid":1,
 "orientation":"orthogonal",
 "renderorder":"right-down",
 "tileheight":28,
 "tilesets":[
        {
         "columns":10,
         "firstgid":1,
         "image":".\/assets\/shapesz.png",
         "imageheight":1736,
         "imagewidth":240,
         "margin":0,
         "name":"background",
         "spacing":0,
         "tilecount":620,
         "tileheight":28,
         "tilewidth":24,
         "transparentcolor":"#c0dcc0"
        }],
 "tilewidth":24,
 "version":1,
 "width":100
}
},{}]},{},[1]);
