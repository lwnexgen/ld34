ig.module(
    'drop'
)
    .requires(
	'impact.game',
	'impact.entity',
	'impact.collision-map',
	'impact.background-map',
	'impact.font'
    )
    .defines(function(){	
	// The Backdrop image for the game, subclassed from ig.Image
	// because it needs to be drawn in it's natural, unscaled size, 
	FullsizeBackdrop = ig.Image.extend({
	    resize: function(){},
	    draw: function() {
		if( !this.loaded ) { return; }
		ig.system.context.drawImage( this.data, 0, 0 );
	    }
	});

	// The Collectable Coin Entity
	EntityBomb = ig.Entity.extend({
	    size: {x:5, y:4},
	    offset: {x:1, y:4},
	    animSheet: new ig.AnimationSheet( 'media/bomb.png', 8, 8 ),
	    type: ig.Entity.TYPE.B,
	    checkAgainst: ig.Entity.TYPE.B,
	    sound: new ig.Sound('media/coin.ogg'),
	    
	    init: function( x, y, settings ) {
		this.addAnim( 'idle', 0.2, [0,0,1] );		
		this.parent( x, y, settings );
	    },
	    
	    update: function() {
		this.parent();

		if( this.pos.y - ig.game.screen.y < -32 ) {
		    this.kill();
		}
	    },
	    
	    check: function( other ) {
		other.bombContact( this );
	    },

	    playerContact: function() {
		ig.game.gameOver = true;
		this.gameOverSound.play();
	    },

	    bombContact: function( bomb ) {
		//first bomb always sticks
		bomb.kill();
	    }
	});

	// The Collectable Coin Entity
	EntityEnemy = ig.Entity.extend({
	    size: {x:8, y:8},
	    animSheet: new ig.AnimationSheet( 'media/monkey.png', 8, 8 ),
	    type: ig.Entity.TYPE.B,
	    checkAgainst: ig.Entity.TYPE.B,
	    sound: new ig.Sound('media/coin.ogg'),

	    init: function( x, y, settings ) {
		this.addAnim( 'idle', 0.15, [0,2,2,0,1,1] );	
		this.parent( x, y, settings );
		this.accel.y = 2;
	    },
	    
	    update: function() {
		this.parent();
		if( this.pos.y - ig.game.screen.y < -32 ) {
		    console.log("Killing " + this);
		    this.kill();
		}
	    },
	    
	    bombContact: function( bomb ) {
		ig.game.score += 1;

		bomb.kill()
		this.kill()
	    },

	    playerContact: function() {
		ig.game.gameOver = true;
		this.gameOverSound.play();
	    }
	});

	// The Bouncing Player Ball thing
	EntityPlayer = ig.Entity.extend({
	    size: {x:8, y:7},
	    offset: {x:0, y: 1},
	    checkAgainst: ig.Entity.TYPE.B,
	    type: ig.Entity.TYPE.A,

	    animSheet: new ig.AnimationSheet( 'media/player.png', 8, 8 ),
	    
	    maxVel: {x: 50, y: 300},
	    friction: {x: 600, y:0},
	    speed: 0,
	    bounciness: 0,
	    sound: new ig.Sound('media/bounce.ogg'),
	    
	    init: function( x, y, settings ) {
		this.addAnim( 'idle', 0.1, [1,1,2,3,3,2] );		
		this.parent( x, y, settings );
	    },
	    
	    update: function() {
		// User Input
		if (ig.input.pressed('swap')) {
		    if (this.pos.x == 21) {
			this.pos.x = 37;
		    } else {
			this.pos.x = 21;
		    }
		}
		
		this.parent();
	    },
	    
	    handleMovementTrace: function( res ) {
		if( res.collision.y && this.vel.y > 32 ) {
		    this.sound.play();
		}
		this.parent(res);
	    },

	    check: function( other ) {
		other.playerContact();
	    }
	});

	// A Custom Loader for the game, that, after all images have been
	// loaded, goes through them and "pixifies" them to create the LCD
	// effect.
	DropLoader = ig.Loader.extend({
	 //    end: function() {
		// for( i in ig.Image.cache ) {
		//     var img = ig.Image.cache[i];
		//     if( !(img instanceof FullsizeBackdrop) ) {
		// 	this.pixify( img, ig.system.scale );
		//     }
		// }
		// this.parent();
	 //    },
	    
	    
	 //    // This essentially deletes the last row and collumn of pixels for each
	 //    // upscaled pixel.
	 //    pixify: function( img, s ) {
	 //    	var ctx = img.data.getContext('2d');
	 //    	var px = ctx.getImageData(0, 0, img.data.width, img.data.height);
		
	 //    	for( var y = 0; y < img.data.height; y++ ) {
	 //    	    for( var x = 0; x < img.data.width; x++ ) {
	 //    		var index = (y * img.data.width + x) * 4;
	 //    		var alpha = (x % s == 0 || y % s == 0) ? 0 : 0.9;
	 //    		px.data[index + 3] = px.data[index + 3] * alpha;
	 //    	    }
	 //    	}
	 //    	ctx.putImageData( px, 0, 0 );
	 //    }
	});

	// The actual Game Source
	DropGame = ig.Game.extend({
	    clearColor: null, // don't clear the screen
	    gravity: 0,
	    player: null,
	    
	    map: [],
	    score: 0,
	    speed: 1,
	    
	    tiles: new ig.Image( 'media/tiles.png' ),
	    backdrop: new FullsizeBackdrop( 'media/backdrop.png' ),
	    font: new ig.Font( 'media/04b03.font.png' ),
	    gameOverSound: new ig.Sound( 'media/gameover.ogg' ),

	    init: function() {
		// uncomment this next line for more authentic (choppy) scrolling
		//ig.system.smoothPositioning = false; 
		
		ig.input.bind(ig.KEY.X, 'swap');
		ig.input.bind(ig.KEY.C, 'bomb');
		ig.input.bind(ig.KEY.ENTER, 'ok');

		var grass = new ig.BackgroundMap( 8, [0,0,0,0,0,0,0,0], 'media/grass.png' );
		grass.repeate = true;
		
		this.row = [0,1,1,0];

		// The first part of the map is always the same
		this.map = [];

		// Now randomly generate the remaining rows
		for( var y = 0; y < 6; y++ ) {	
		    this.map[y] = this.row.slice();
		}
		
		// The map is used as CollisionMap AND BackgroundMap
		// this.collisionMap = new ig.CollisionMap( 16, this.map );
		var bgmap = new ig.BackgroundMap(16, this.map, 'media/stalk16.png');
		bgmap.repeat = true;

		this.backgroundMaps.push( bgmap );
		this.backgroundMaps.push( grass );  //TODO:   Doesn't work.
		console.log(grass);
		this.player = this.spawnEntity( EntityPlayer, 21, ig.system.height/2-2 );

		this.enemySpawned = false;
	    },
	    	    	    
	    update: function() {
		if( ig.input.pressed('ok') ) {
		    ig.system.setGame( DropGame );
		}
		
		if( this.gameOver ) {
		    return;
		}
		
		var offset = (ig.system.tick * this.speed);
		this.speed += ig.system.tick * (10/this.speed);

		// keep the player in the same Y position
		this.player.pos.y -= offset;
		
		this.screen.y -= offset;
		
		// Do we need a new row?
		if( Math.abs(this.screen.y % 8) <= offset ) {
		    if (! this.enemySpawned) {
			this.spawnEntity( EntityEnemy, this.player.pos.x, this.screen.y )
			this.enemySpawned = true;
		    }
		} else {
		    this.enemySpawned = false;
		}

		if( ig.input.pressed('bomb') ) {
		    this.spawnEntity( EntityBomb, this.player.pos.x, this.player.pos.y - (this.speed + 8) );
		}

		this.parent();
	    },
	    
	    draw: function() {
		this.backdrop.draw();
		
		if( this.gameOver ) {
		    this.font.draw( 'Game Over!', ig.system.width/2, 32, ig.Font.ALIGN.CENTER );
		    this.font.draw( 'Press Enter', ig.system.width/2, 48, ig.Font.ALIGN.CENTER );
		    this.font.draw( 'to Restart', ig.system.width/2, 56, ig.Font.ALIGN.CENTER );
		}
		else {
		    this.parent();
		}
		
		this.font.draw(this.score.toString(), ig.system.width -2, 2, ig.Font.ALIGN.RIGHT );
	    }
	});
	
	ig.main('#canvas', DropGame, 30, 64, 96, 5, DropLoader);
    });
