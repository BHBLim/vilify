/*!
 * Vilify main.js
 */

(function(window) {

	var Game = window.Game = {

		/**
		 * various settings and objects that will be accessed throughout
		 * stage: CreateJS's version of canvas+context
		 * queue: CreateJS's resource loading mechanism
		 * scene: the current scene being displayed
		 * size: the width and height of the canvas
		 */
		stage: null,
		queue: null,
		data: null,
		fps: 60,
		scene: null,
		size: null,

		/**
		 * variables to hold objects
		 */
		SCENES: {},
		GROUND: null,
		CANNON: null,
		GRAVEYARD: null,
		ITEMS: [],
		TOWERS: [],
		PROJECTILES: [],
		HEROES: [],
		MONSTERS: [],
		EFFECTS: {},

		/**
		 * Load all the assets
		 */
		load: function() {
			Game.queue = new createjs.LoadQueue();

			// Load Game data
			Game.queue.on("fileload", function(e) {
				if (e.item.id === "objects.json") {
					Game.DATA = e.result;
					Game.queue.off("fileload", arguments.callee);
				}
			});
			Game.queue.on("complete", function(e) {
				Game.init("canvas", Game.SCENES["game"]);
			}, null, true);

			Game.queue.loadFile("objects.json", true, "game_data/");
		},

		/**
		 * Initialize CreateJS and all the necessary stuffs
		 */
		init: function(canvasID, scene) {
			Game.stage = new createjs.Stage(canvasID);
			Game.changeScene(scene);
			createjs.Ticker.setFPS(Game.fps);
			createjs.Ticker.addEventListener("tick", Game.tick);
		},

		/**
		 * Called to update the screen
		 */
		tick: function(event) {
			Game.scene.tick(event);
			Game.stage.update();
		},

		/**
		 * Change the active scene
		 */
		changeScene: function(newScene) {
			newScene.init();
			Game.scene = newScene;
		}
	}


	/**
	 * A scene to be displayed upon the canvas
	 * e.g. Loading screen, High score screen, Game screen
	 */
	function Scene(init, tick) {
		this.init = init; // The function that is called to initialize the scene
		this.tick = tick; // The function that is called ever time the game updates, should take one parameter "event"
	}

	Game.Scene = Scene;

	Game.SCENES["loading"] = new Scene(
		function() {},
		function(event) {}
	);

	Game.SCENES["game"]  = new Scene(
		function() {
			// Create ground
			Game.GROUND = new Ground();
			Game.stage.addChild(Game.GROUND); // Display ground on screen

			// Create towers
			for (i = 0; i < 6; i++) {
				tower = new Tower(null, 100+152*i);
				Game.TOWERS.push(tower);
				Game.stage.addChild(tower); // Display towers on screen
			}

			// Create graveyard
			Game.GRAVEYARD = new Graveyard();
			Game.stage.addChild(Game.GRAVEYARD); // Display graveyard on screen

			// Create cannon
			Game.CANNON = new Cannon();
			Game.stage.addChild(Game.CANNON); // Display cannon on screen

			// Create items
			for (i = 0; i < 14; i++) {
				// Select a random type of item
				type = ["tech","chemical","alien"][MathEx.randInt(0,2)];

				// Pick a random location to spawn the item at
				x = MathEx.randInt(0, 600);
				y = MathEx.randInt(0, 600);

				item = new Item(type, x, y);
				Game.ITEMS.push(item);
				Game.stage.addChild(item); // Display item on screen
			}
		},
		function(event) {
			// Update heroes
			for (i = 0; i < Game.HEROES.length; i++) {
				Game.HEROES[i].tick(event);
			}

			// Update towers
			for (i = 0; i < Game.TOWERS.length; i++) {
				Game.TOWERS[i].tick(event);
			}

			// Update projectiles
			for (i = 0; i < Game.PROJECTILES.length; i++) {
				Game.PROJECTILES[i].tick(event);
				for (j = 0; j < Game.HEROES.length; j++) { // Has a hero been hit by the projectile?
					if (Game.PROJECTILES[i].collides(Game.HEROES[j].getBox())) {
						// Deal damage to hero and kill protile
						Game.PROJECTILES[i].kill();
						Game.HEROES[j].damage(Game.PROJECTILES[i].damage);
					}
				}
			}

			// Update monsters
			for (i = 0; i < Game.MONSTERS.length; i++) {
				Game.MONSTERS[i].tick(event);
				for (j = 0; j < Game.HEROES.length; j++) { // Does monster collide with a hero?
					if (Physics.collides(Game.HEROES[j].getBox(), Game.MONSTERS[i].getBox())) { // Then start combat between them
						hero.inCombat = Game.MONSTERS[i];
						monster.inCombat = Game.HEROES[j];
					}
				}
			}

			// Update items
			for (i = 0; i < Game.ITEMS.length; i++) {
				Game.ITEMS[i].tick(event);
			}
		}
	);


	/**
	 * Tower object
	 * Store all the data associated with one tower
	 */
	function Tower(type, x) {
		this.initialize(type, x);
	}

	Game.Tower = Tower;

	var p = Tower.prototype = new createjs.Container();
	Tower.prototype.Container_initialize = p.initialize;

	Tower.prototype.initialize = function(type, x) {
		this.Container_initialize();

		// Set Tower's data
		this.type = type;
		if (this.type != null) {
			this.name = Game.DATA["towers"][this.type]["name"];
			this.attacks = Game.DATA["towers"][this.type]["attacks"]; // Attacks tower can exicute
			this.rate = Game.DATA["towers"][this.type]["rate"]; // Rate at which the tower fires projectiles
			this.projectileTimer = Game.fps * this.rate;  // Timeout between projectiles
		}

		// Set Tower's size
		this.radius = 50;

		// Set Tower's position
		this.x = x;

		// Create Tower's image
		var color;
		if (this.type == null) {
			color = "#eee";
		} else {
			color = Game.DATA["towers"][this.type]["image"];
		}
		var image = new createjs.Shape();
		image.graphics.beginFill(color).drawCircle(0, 0, this.radius);
		this.addChild(image);

		// Update tower
		this.tick = function(event) {
			if (this.type != null) {
				// Countdown towards next projectile
				this.projectileTimer -= event.delta / 10;

				if (this.projectileTimer < 0) { // Is it time to fire projectile yet?
					// Reset timer
					this.projectileTimer = Game.fps * this.rate;

                    // Pick attack to use
					var attack = this.attacks[MathEx.randInt(0, this.attacks.length - 1)]; // TODO: weight attacks

					// Fire projectile
					var projectile;
					switch (attack.type) {
					    case "bullet":
        					projectile = new Bullet(attack.damge, this.x, this.radius);
        					break;
        				case "cloud":
        				    projectile = new Cloud(this.x, this.radius);
        					break;
					}
        			Game.PROJECTILES.push(projectile);
        			Game.stage.addChild(projectile); // Display projectile
				}
			}
		}

		/**
		 * Upgrade the tower to a higher level
		 * type: the type of Item the tower was upgraded with
		 * Returns true if upgrade was successful, other returns false
		 */
		this.upgrade = function(type) {
			// Update tower type
			var newType;
			if (this.type == null) {
				newType = type;
			} else {
				newType = (this.type + type).sort(true);
			}

			if (!Game.DATA["towers"][newType]) { // Does tower exist?
				return false;
			}

			// Update tower data
			this.type = newType;
			this.name = Game.DATA["towers"][this.type]["name"];
			this.rate = Game.DATA["towers"][this.type]["rate"];
			this.attacks = Game.DATA["towers"][this.type]["attacks"];
			this.projectileTimer = Game.fps * this.rate;  // Timeout between projectiles

			// Remove old tower image
			this.removeAllChildren();

			// Get new tower image
			var color;
			if (this.type == null) {
				color = "#eee";
			} else {
				color = Game.DATA["towers"][this.type]["image"];
			}
			var image = new createjs.Shape();
			image.graphics.beginFill(color).drawCircle(0, 0, this.radius);
			this.addChild(image); // Display new image

			return true; // Success!!!
		}

		/**
		 * Get the tower's bounding box
		 */
		this.getBox = function() {
			return {left: this.x, top: 0, width: this.radius * 2, height: this.radius};
		}
	}

    /**
	 * Projectile object
	 * A superclass object for every projectile that the towers and cannon fire
	 */
	function Projectile() {
		this.initialize();
	}
	Game.Projectile = Projectile;

	var p = Projectile.prototype = new createjs.Container();
	Projectile.prototype.Container_initialize = p.initialize;

	Projectile.prototype.initialize = function() {
		this.Container_initialize();

		// Set Projectile's size
		this.width = 0;
		this.height = 0;

		// Set Projectile's location
		this.x = 0;
		this.y = 0;

		// Set Projectile's velocity
		this.Vx = 0;
		this.Vy = 0;

		// Set Projectile's acceleration
		this.Ax = 0;
		this.Ay = 0;

		/**
		 * Get the bounding box of the projectile
		 */
		this.getBox = function() {
			return {left: this.x, top: this.y, width: this.width, height: this.height}
		}

		/**
		 * Does projectile collide with box?
		 */
		this.collides = function(box) {
		     // Overide me
		     return false;
		}

		/**
		 * Remove the projectile and all references to it
		 */
		this.kill = function() {
			Game.PROJECTILES.splice(Game.PROJECTILES.indexOf(this), 1);
			this.removeAllChildren();
			Game.stage.removeChild(this);
		}
	}


	/**
	 * Bullet object
	 * An object for the bullets that a tower fires
	 */
	function Bullet(damage, x, y) {
		this.initialize(damage, x, y);
	}

	Game.Bullet = Bullet;

	var p = Bullet.prototype = new Projectile();
	Bullet.prototype.Projectile_initialize = p.initialize;

	Bullet.prototype.initialize = function(damage, x, y) {
		this.Projectile_initialize();

		// Set Bullet's data
		this.damage = damage;

		// Set Bullet's size
		this.width = 10;
		this.height = 10;

		// Set Bullet's position
		this.x = x - this.width / 2;
		this.y = y - this.height / 2;

		// Set Bullet's velocity
		this.Vx = 50;
		this.Vy = 300;

		// Set Bullet's acceleration
		this.Ay = 150;

		// Create Bullet's image
		var image = new createjs.Shape();
		image.graphics.beginFill("#444").drawRect(0, 0, this.width, this.height);
		this.addChild(image);

		/**
		 * Update the bullet
		 */
		this.tick = function(event) {
			// Update bullet's position by it's velocity
			this.x += event.delta / 1000 * this.Vx;
			this.y += event.delta / 1000 * this.Vy;

			// Update bullet's velocity by it's acceleration
			this.Vy += event.delta / 1000 * this.Ay;

			// Remove bullet if it goes off the screen
			if (this.x < -1 * this.width || this.x > 960 || this.y < -1 * this.height || this.y > 640) {
				this.kill();
			}
		}

		/**
		 * Does bullet collide with box?
		 */
		this.collides = function(box) {
		     return Physics.collides(this.getBox(), box);
		}
	}


    /**
	 * Beam object
	 * An object for the bullets that a tower fires
	 */
	function Cloud(x, y) {
		this.initialize(x, y);
	}

	Game.Cloud = Cloud;

	var p = Cloud.prototype = new Projectile();
	Cloud.prototype.Projectile_initialize = p.initialize;

	Cloud.prototype.initialize = function(x, y) {
		this.Projectile_initialize();

		// Set Cloud's size
		this.width = 120;
		this.height = 70;

		// Set Cloud's position
		this.x = x - this.width / 2;
		this.y = y - this.height / 2;

		// Set Cloud's velocity
		this.Vy = 100;

		// Set Cloud's acceleration
		this.Ay = 30;

		// Get Cloud's image
		var image = new createjs.Shape();
		image.graphics.beginFill("rgb(224, 218, 148)").drawRect(0, 0, this.width, this.height);
		this.addChild(image);

		/**
		 * Update the cloud
		 */
		this.tick = function(event) {
			// Update bullet's position by it's velocity
			this.x += event.delta / 1000 * this.Vx;
			this.y += event.delta / 1000 * this.Vy;

			// Update bullet's velocity by it's acceleration
			this.Vy += event.delta / 1000 * this.Ay;

			// Remove bullet if it goes off the screen
			if (this.x < -1 * this.width || this.x > 960 || this.y < -1 * this.height || this.y > 640) {
				this.kill();
			}
		}

		// Get box of bullet
		this.getBox = function() {
			return {left: this.x, top: this.y, width: 120, height: 70}
		}
	}


	/**
	 * Monster object
	 * A monster that the mad scientist has created to protected his lab
	 */
	function Monster(type) {
		this.initialize(type);
	}

	Game.Monster = Monster;

	var p = Monster.prototype = new createjs.Container();
	Monster.prototype.Container_initialize = p.initialize;

	Monster.prototype.initialize = function(type) {
		this.Container_initialize();

		// Set Monster's size
		this.width = 70;
		this.height = 100;

		// Set Monster's position
		this.x = Game.GRAVEYARD.x + Game.GRAVEYARD.width / 2 - this.width / 2;
		this.y = Game.GROUND.y - this.height;

		// Monster velocity
		this.Vx = 0;
		this.Vy = 0;

		// Set Monster's data
		this.type = type;
		this.health = Game.DATA["monsters"][this.type]["health"];
		this.speed = Game.DATA["monsters"][this.type]["speed"];
		this.flying = Game.DATA["monsters"][this.type]["flying"];
		this.goal = [this.x, this.y];

		// Monster's state
		// IDLE: Waiting for orders
		// MOVING: Moving to goal
		// COMBAT: In combat with hero
		this.state = "IDLE";

		// Get Monster's image
		var color;
		if (this.type == null) {
			color = "#eee";
		} else {
			color = Game.DATA["monsters"][this.type]["image"];
		}
		var image = new createjs.Shape();
		image.graphics.beginFill(color).drawRect(0, 0, this.width, this.height);
		this.addChild(image); // Display image

		/**
		 * Update the monster
		 */
		this.tick = function(event) {
			switch (this.state) { // What state is the monster in
				case "MOVING": // Move monster
					// Is it a flying monster?
					if (this.flying) {
						// Move on the y-axis
						this.y += event.delta/1000 * this.Vy;

						// Has the monster reached it's goal?
						if ((this.goal[1] > this.y && this.Vy < 0) || (this.goal[1] < this.y && this.Vy > 0)) {

						}
					}

					// Move on x-axis
					this.x += event.delta/1000 * this.Vx;

					// Has the monster reached it's goal?
					if ((this.goal[0] > this.x && this.Vx < 0) || (this.goal[0] < this.x && this.Vx > 0)) {
						// Then stop the monster
						this.Vx = 0;
						this.Vy = 0;

						// And make sure it is exactly on it's goal
						this.x = this.goal[0];
						this.y = this.goal[1];

						// Change status
						this.status == "IDLE";
					}
					break;
				case "IDLE":
				default:
					break;
			}
		}


		/**
		 * Handle click
		 */
		var handlePressDown = function(event) {
			// Reset monsterMove effect
			Game.EFFECTS["monsterMove"] = {image: null};
		}

		/**
		 * Handle drag
		 */
		var handlePressMove = function(event) {
			// Remove old monsterMove effect
			Game.stage.removeChild(Game.EFFECTS["monsterMove"].image);

			// Calculate new monsterMove effect
			var endY;
			if (event.target.parent.flying) {
				endY = event.stageY;
			} else {
				endY = event.target.parent.y + event.target.parent.height / 2;
			}

			// Add new monsterMove effect
			effect = new createjs.Shape();
			effect.graphics.moveTo(event.target.parent.x + event.target.parent.width / 2, event.target.parent.y + event.target.parent.height / 2);
			effect.graphics.setStrokeStyle(20, "round").beginStroke("rgba(0, 0, 0, 0.2)");
			effect.graphics.lineTo(event.stageX, endY).endStroke();
			Game.EFFECTS["monsterMove"].image = effect;
			Game.stage.addChild(effect); // Display effect
		}

		/**
		 * Handle release
		 */
		var handlePressUp = function(event) {
			// Update monster status
			event.target.parent.state = "MOVING";

		    // Set new goal
			event.target.parent.goal[0] = event.stageX - event.target.parent.width / 2;

			// Don't let the monster go off screen
			if (event.target.parent.goal[0] < 0) {
			    event.target.parent.goal[0] = 0;
			} else if (event.target.parent.goal[0] > 960 - event.target.parent.width) {
			    event.target.parent.goal[0] = 960 - event.target.parent.width;
			}

			// Set monster's new x velocity
			if (event.target.parent.goal[0] < event.target.parent.x) {
				event.target.parent.Vx = event.target.parent.speed * -1;
			}
			else if (event.target.parent.goal[0] > event.target.parent.x) {
				event.target.parent.Vx = event.target.parent.speed;
			}

			// Is it a flying monster?
    		if (event.target.parent.flying) {
				// Set new goal
    			event.target.parent.goal[1] = event.stageY - event.target.parent.height / 2;

    			// Don't let monster go below ground
    			if (event.target.parent.goal[1] > Game.GROUND.y - event.target.parent.height) {
    			    event.target.parent.goal[1] = Game.GROUND.y - event.target.parent.height;
    			}

    			// TODO: Don't let the monster go to high

    			// Calculate x movement to y movement ratio
    			ratio = Math.abs(event.target.parent.goal[1] - event.target.parent.y) / (event.target.parent.goal[0] - event.target.parent.x);

				// Set monster's new y velocity
    			if (event.target.parent.goal[1] < event.target.parent.y) {
    				event.target.parent.Vy = ratio * event.target.parent.speed * -1;
    			}
    			else if (event.target.parent.goal[1] > event.target.parent.y) {
    				event.target.parent.Vy = ratio * event.target.parent.speed;
    			}
    		}

    		// Clear monsterMove effect
			Game.stage.removeChild(Game.EFFECTS["monsterMove"].image);
		}

		// Add event handlers
		image.addEventListener("mousedown", handlePressDown);
		image.addEventListener("pressmove", handlePressMove);
		image.addEventListener("pressup", handlePressUp);

		/**
		 * Upgrade the monster to a higher level
		 * type: the type of Item the monster was upgraded with
		 * Returns true if upgrade was successful, other returns false
		 */
		this.upgrade = function(type) {
			// Calculate new monster type
			var newType;
			if (this.type == null) {
				newType = type;
			} else {
				newType = (this.type + type).sort(true);
			}

			// Does monster type exist?
			if (!Game.DATA["monsters"][newType]) {
				return false;
			}

			// Update monster's data
			this.type = newType;
			this.health = Game.DATA["monsters"][this.type]["health"];
			this.speed = Game.DATA["monsters"][this.type]["speed"];
			this.flying = Game.DATA["monsters"][this.type]["flying"];

			// Remove old monster image
			this.removeAllChildren();

			// Set new monster image
			var color;
			if (this.type == null) {
				color = "#eee";
			} else {
				color = Game.DATA["monsters"][this.type]["image"];
			}
			var image = new createjs.Shape();
			image.graphics.beginFill(color).drawRect(0, 0, 70, 100);
			this.addChild(image); // Display new image

			// Add event handlers
			image.addEventListener("mousedown", handlePressDown);
			image.addEventListener("pressmove", handlePressMove);
			image.addEventListener("pressup", handlePressUp);

			return true;
		}

		/**
		 * Deal damage to the monster
		 * damage: amount of damage to be dealt
		 */
		this.damage = function(amount) {
			// Subtract damage from health
			this.health -= amount;

			// Does monster have zero or less health?
			if (this.health <= 0) {
				// Then the monster DIES!!!
				this.kill();
			}
		}

		/**
		 * Returns the monster's bounding box
		 */
		this.getBox = function() {
			return {left: this.x, top: this.y, width: this.width, height: this.height};
		}

		/**
		 * Destroy the monster and all references to it
		 */
		this.kill = function() {
			Game.MONSTERS.splice(Game.MONSTERS.indexOf(this), 1);
			this.removeAllChildren();
			Game.stage.removeChild(this);
		}
	}


	/**
	 * Graveyard object
	 * Where monsters spawn
	 */
	function Graveyard() {
		this.initialize();
	}

	Game.Graveyard = Graveyard;

	var p = Graveyard.prototype = new createjs.Container();
	Graveyard.prototype.Container_initialize = p.initialize;

	Graveyard.prototype.initialize = function() {
		this.Container_initialize();

		// Graveyard's size
		this.width = 120;
		this.height = 20;

		// Graveyard's position
		this.x = 700;
		this.y = Game.GROUND.y - this.height;

		// Graveyard's image
		var image = new createjs.Shape();
		image.graphics.beginFill("#d61500").drawRect(0, 0, this.width, this.height);
		this.addChild(image);

		/**
		 * Returns the graveyard's bounding box
		 */
		this.getBox = function() {
			return {left: this.x, top: this.y, width: this.width, height: this.height};
		}

		/**
		 * Destroy the graveyard and all references to it
		 */
		this.kill = function() {
			Game.GRAVEYARD = null;
			this.removeAllChildren();
			Game.stage.removeChild(this);
		}
	}


	/**
	 * Cannon object
	 * The cannon from which the mad scientist fire potion at the heroes
	 */
	function Cannon() {
		this.initialize();
	}

	Game.Cannon = Cannon;

	var p = Cannon.prototype = new createjs.Container();
	Cannon.prototype.Container_initialize = p.initialize;

	Cannon.prototype.initialize = function() {
		this.Container_initialize();

		// Cannon's size
		this.width = 120;
		this.height = 100;

		// Cannon's position
		this.x = 835;
		this.y = Game.GROUND.y - this.height;

		// Cannon's image
		var image = new createjs.Shape();
		image.graphics.beginFill("#111").drawRect(0, 0, this.width, this.height);
		this.addChild(image);

		/**
		 * Returns the cannon's bounding box
		 */
		this.getBox = function() {
			return {left: this.x, top: this.y, width: this.width, height: this.height};
		}

		/**
		 * Remove the cannon and all references to it
		 */
		this.kill = function() {
			Game.CANNON = null;
			this.removeAllChildren();
			Game.stage.removeChild(this);
		}
	}


	/**
	 * Hero object
	 * Store all the data associated with one hero
	 */
	function Hero(type) {
		this.initialize(type);
	}

	Game.Hero = Hero;

	var p = Hero.prototype = new createjs.Container();
	Hero.prototype.Container_initialize = p.initialize;

	Hero.prototype.initialize = function(type) {
		this.Container_initialize();

		// Set hero's data
		this.type = type;
		this.flying = Game.DATA["heroes"][this.type]["flying"];
		this.health = Game.DATA["heroes"][this.type]["health"];

		// Set hero's size
		this.width = 70;
		this.height = 100;

		// Calculate hero's y position
		var y = 530;
		var Vy = 0;
		if (this.flying) {
			y = MathEx.randInt(120, 420);
			Vy = this.flying["velocity"]; // y velocity
			this.flyingHeight = this.flying["height"]; // height difference from starting y that the hero goes to while flying
		}

		// Set hero's position
		this.x = -70;
		this.y = y;

		// Hero velocity
		this.Vx = Game.DATA["heroes"][this.type]["speed"];
		this.Vy = Vy;
		this.starty = this.y;

		// Hero's state
		// IDLE: Not doing anything
		// MOVING: Moving towards target
		// COMBAT: In combat with monster
		this.state = "MOVING";

		// Hero image
		var image = new createjs.Shape();
		image.graphics.beginFill("#54eb46").drawRect(0, 0, this.width, this.height);
		this.addChild(image);

		/**
		 * Update hero
		 */
		this.tick = function(event) {
			switch (this.state) { // What state is the hero in?
				case "MOVING": // Move hero
					// Move on x-axis
					this.x += event.delta / 1000 * this.Vx;

					// Fly
					if (this.flying) {
						this.y += event.delta / 1000 * this.Vy; // Move on y-axis
						if (this.y > this.starty + this.flyingHeight || this.y < this.starty - this.flyingHeight) { // Oscillate flying
							this.Vy = -1 * this.Vy;
						}
					}
					break;
				case "IDLE":
				default:
					break;
			}
		}

		/**
		 * Deal damage to the hero
		 * damage: the amout of damage dealt
		 */
		this.damage = function(amount) {
			// Subtract damage from heroes life
			this.health -= amount;

			// If the hero has less than 1 life
			if (this.health <= 0) {
				// then it dies
				this.kill();
			}
		}

		/**
		 * Get the heroes bounding box
		 */
		this.getBox = function() {
			return {left: this.x, top: this.y, width: this.width, height: this.height};
		}

		/**
		 * Remove object
		 */
		this.kill = function() {
			Game.HEROES.splice(Game.HEROES.indexOf(this), 1);
			this.removeAllChildren();
			Game.stage.removeChild(this);
		}
	}


	/**
	 * Item object
	 * An item that can be used to build or upgrad towers, monsters and potions
	 */
	function Item(type, x, y) {
		this.initialize(type, x, y);
	}

	Game.Item = Item;

	var p = Item.prototype = new createjs.Container();
	Item.prototype.Container_initialize = p.initialize;

	Item.prototype.initialize = function(type, x, y) {
		this.Container_initialize();

		// Set item's data
		this.type = type;
		this.goal = ItemsList.book();

		// Set item's size
		this.width = 30;
		this.height = 30;

		// Set item's position
		this.x = x;
		this.y = y;

		// Set item's velocity
		this.Vx = 1000;
		this.Vy = (this.goal[1] - this.y) / (this.goal[0] - this.x) * 1000;

		// Item state
		// FREE: item is out of lists and needs to be added
		// LISTED: item is in list
		// DRAGGING: item is being dragged by the player
		// REORDER: item is being reordered in the list
		this.state = "FREE";

		// Item image
		var color;
		if (this.type == "tech") {
			color = "#999";
		} else if (this.type == "chemical") {
			color = "#2483ff";
		} else if (this.type == "alien") {
			color = "#61289e";
		}
		var image = new createjs.Shape();
		image.graphics.beginFill(color).drawRect(0, 0, this.width, this.height);
		this.addChild(image); // Display item

		var handlePressMove = function(event) {
			// Update item's state
			event.target.parent.state = "DRAGGED";

			// Update item's position
			event.target.parent.x = event.stageX;
			event.target.parent.y = event.stageY;
		}

		var handlePressUp = function(event) {
			used = false;

			// Does item collide with tower?
			for (i = 0; i < Game.TOWERS.length; i++) {
				 // Then attempt to build/upgraded that tower
				if (Physics.collides(Game.TOWERS[i].getBox(), event.target.parent.getBox())) {
					used = Game.TOWERS[i].upgrade(event.target.parent.smallString());
					break;
				}
			}

			// Does item collide with graveyard?
			if (!used && Physics.collides(Game.GRAVEYARD.getBox(), event.target.parent.getBox())) {
				// Build monster
				monster = new Monster(event.target.parent.smallString());
				Game.stage.addChild(monster);
				Game.MONSTERS.push(monster);

				// Mark item as used
				used = true;
			} else {
				// Does item collide with monster?
				for (i = 0; i < Game.MONSTERS.length; i++) {
					// Then attempt to upgrade monster
					if (Physics.collides(Game.MONSTERS[i].getBox(), event.target.parent.getBox())) {
						used = Game.MONSTERS[i].upgrade(event.target.parent.smallString());
						break;
					}
				}
			}

			// Was the item used?
			if (used) {
				y = event.target.parent.goal[1];

				// Remove item from game
				event.target.parent.kill();

				// Reorder ItemsList
				ItemsList.free(y);
			} else {
				// Send item back to ItemsList
				event.target.parent.state = "FREE";
				event.target.parent.Vx = 1000;
				event.target.parent.Vy = (event.target.parent.goal[1] - event.target.parent.y) / (event.target.parent.goal[0] - event.target.parent.x) * 1000;
			}
		}

		// Add event handlers
		image.addEventListener("pressmove", handlePressMove);
		image.addEventListener("pressup", handlePressUp);

		/**
		 * Update item
		 */
		this.tick = function(event) {
			switch (this.state) {
			 	case "FREE": // Go into ItemsList
			 		// Move item
					this.x += event.delta / 1000 * this.Vx;
					this.y += event.delta / 1000 * this.Vy;

					// Has item reached ItemsList?
					if (this.x >= this.goal[0]) {
						// Update item's state
						this.state = "LISTED";

						// Make sure item is exactly at goal
						this.x = this.goal[0];
						this.y = this.goal[1];
					}
					break;
				case "REORDER": // Item is being reorder inside ItemsList
					// Move
					this.y += event.delta/1000 * this.Vy;

					// Has item reached new position in ItemsList?
					if (this.y <= this.goal[1]) {
						// Update item's state
						this.state = "LISTED";

						// Make sure item is exactly at goal
						this.x = this.goal[0];
						this.y = this.goal[1];
					}
					break;
			}
		}

		/**
		 * Get small string form of item
		 */
		this.smallString = function() {
			if (this.type == "tech") return "T";
			else if (this.type == "chemical") return "C";
			else if (this.type == "alien") return "A";
		}

		/**
		 * Gets item's bounding box
		 */
		this.getBox = function() {
			return {left: this.x, top: this.y, width: this.width, height: this.height};
		}

		/**
		 * Remove item from game
		 */
		this.kill = function() {
			Game.ITEMS.splice(Game.ITEMS.indexOf(this), 1);
			this.removeAllChildren();
			Game.stage.removeChild(this);
		}
	}

	/**
	 * Store the inventory of items not yet used by player
	 */
	ItemsList = {
		// Data
		openPositions: [], // Positions that are open in items list
		bank: 0, // If no position are left in the list, extra item go to the bank
		interval: 0, // space in between items
		xPos: 0, // x position of the list

		/**
		 * Sets up ItemsList
		 * start: starting y value for the list
		 * interval: spacing in between items
		 * len: number of items that can be stored before using the bank
		 * xPos: x position of list
		 */
		init: function(start, interval, len, xPos) {
			// Save data
			this.interval = interval;
			this.xPos = xPos;

			// Calculate positions
			pos = start;
			for (i = 0; i < len; i++) {
				// Add new position to list
				this.openPositions.push(pos);

				// Set next position
				pos += interval;
			}

			// Set bank position
			this.bank = pos;
		},
		/**
		 * Books a position in the list for an item
		 */
		book: function() {
			// Is there an open position?
			if (this.openPositions.length > 0) {
				// Return it and mark it as used
				y = this.openPositions[0];
				this.openPositions.splice(0, 1);
				return [this.xPos, y];
			}
			// Otherwise, put in bank
			return [this.xPos, this.bank];
		},
		/**
		 * Frees up a position and reorders the list
		 * y: y value of freed position
		 */
		free: function(y) {
			bankedItemMoved = false;
			for (i = 0; i < Game.ITEMS.length; i++) { // Reorder list
				if (Game.ITEMS[i].y > y && (!bankedItemMoved || !Game.ITEMS[i].y >= this.bank)) { // Only move up the first item in the bank
					if (Game.ITEMS[i].y >= this.bank) {
						bankedItemMoved = true;
					}

					// Update item state
					Game.ITEMS[i].state = "REORDER";

					// Set new velocity
					Game.ITEMS[i].Vx = 0;
					Game.ITEMS[i].Vy = -1000;

					// Set new goal
					Game.ITEMS[i].goal[1] = Game.ITEMS[i].y - this.interval;
				}
			}
		}
	}
	ItemsList.init(90, 40, 8, 900);

	/**
	 * Ground
	 * The floor
	 */
	function Ground() {
		this.initialize();
	}

	Game.Ground = Ground;

	var p = Ground.prototype = new createjs.Container();
	Ground.prototype.Container_initialize = p.initialize;

	Ground.prototype.initialize = function() {
		this.Container_initialize();

		// Ground position
		this.width = 960;
		this.height = 10;
		this.x = 0;
		this.y = 630;

		// Ground image
		var image = new createjs.Shape();
		image.graphics.beginFill("#111").drawRect(0, 0, this.width, this.height);
		this.addChild(image);
	}

	Game.load();

})(window);
