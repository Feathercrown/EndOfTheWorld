//Setup
const { NbtReader, NbtWriter } = require('node-nbt');
Array.prototype.getTag = function getTag(tagName){
    return this.filter(tag=>tag.name==tagName)[0].val;
}
const fs = require('fs');
var zlib = require('zlib');
const Util = require('minecraft-server-util');
const Server = new Util.RCON('localhost', { port: 25575, password: 'endoftheworld' });

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}



//Actual code
async function resetWorld(worldFolder, server){
    await physicallyDestroyWorld(server);
    await deleteRegionData(worldFolder);
    var newSeed = Math.floor(Math.random()*Math.pow(2,16)); //Unknown max limit; suspected 2^32 for low_ and either the same or 0 for high_
    await changeWorldSeed(worldFolder, newSeed);
}

async function changeWorldSeed(worldFolder, seed){
    var file = worldFolder+'\\level.dat';
    fs.readFile(file, function(err, data) {
        zlib.gunzip(data, function(err, buffer) {
            if(!err) {
                var d = NbtReader.readTag(buffer);
                d = NbtReader.removeBufferKey(d);
                //NbtReader.printAscii(d);

                //Get World-Gen Settings
                var settings = d.val[0].val;
                var worldGenSettings = settings.getTag('WorldGenSettings');
                var globalSeed = worldGenSettings.getTag('seed');
                //The Overworld
                var overworld = worldGenSettings.getTag('dimensions').getTag('minecraft:overworld').getTag('generator');
                var overworldGenerationSeed = overworld.getTag('seed');
                var overworldBiomeSeed = overworld.getTag('biome_source').getTag('seed');
                //The Nether
                var nether = worldGenSettings.getTag('dimensions').getTag('minecraft:the_nether').getTag('generator');
                var netherGenerationSeed = nether.getTag('seed');
                var netherBiomeSeed = nether.getTag('biome_source').getTag('seed');
                //Set the Seeds
                overworldGenerationSeed.low_ = seed;
                overworldBiomeSeed.low_ = seed;
                netherGenerationSeed.low_ = seed;
                netherBiomeSeed.low_ = seed;

                zlib.gzip(NbtWriter.writeTag(d), function(err, buffer) {
                    if(!err) {
                        fs.writeFile(file, buffer, function(err){
                            if(err){
                                console.error('Error changing world seed');
                            } else {
                                console.log('Success changing world seed');
                            }
                        });
                    } else {
                        console.log(err);
                    }
                });
            } else {
                console.log(err);
            }
        });
    });
}

async function deleteRegionData(worldFolder){
    clearFolder(worldFolder + '\\region'); //The Overworld
    clearFolder(worldFolder + '\\DIM-1\\region'); //The Nether
}

function clearFolder(regionFolder){
    fs.readdir(regionFolder, (err, files) => {
        if(!err){
            var e = false;
            for (const file of files) {
                console.log(regionFolder + '\\' + file);
                fs.unlink(regionFolder + '\\' + file, (err) => {
                    if(err){
                        console.error('Error deleting region file '+file);
                        e = true;
                    }
                });
            }
            if(e){
                console.error('Error deleting region files');
            } else {
                console.log('Success deleting region files');
            }
        } else {
            console.log(err);
        }
    });
}

function physicallyDestroyWorld(Server){
    return new Promise((resolve, reject) => {
        /*Server.on('output', (message) => {
            console.log(message);
        });*/
    
        const destroyConfig = [
            {
                repeat: 1,
                timeBetween: 500,
                effect: `time set 18000`
            },
            {
                repeat: 1,
                timeBetween: 0,
                effect: `particle minecraft:enchant ~ ~ ~ 8 8 8 1 100000 force`,
                perPlayer: true
            },
            {
                repeat: 1,
                timeBetween: 0,
                effect: `playsound minecraft:entity.elder_guardian.curse master @a ~ ~ ~ 2 1 1`
            },
            {
                repeat: 1,
                timeBetween: 0,
                effect: `playsound minecraft:entity.wither.spawn master @a ~ ~ ~ 2 1 1`
            },
            {
                repeat: 1,
                timeBetween: 1000,
                effect: `effect give @e minecraft:levitation 99999 1 true`
            },
            {
                repeat: 5,
                timeBetween: 1000,
                effect: function(j){return `particle minecraft:portal ~ ~${Math.round(18*(1-(j/10)))+3} ~ 3 0.05 3 1 10000 force`;},
                perPlayer: true
            },
            {
                repeat: 1,
                timeBetween: 0,
                effect: `playsound minecraft:ambient.cave master @a ~ ~ ~ 2 1 1`,
                perPlayer: true
            },
            {
                repeat: 1,
                timeBetween: 0,
                effect: `playsound minecraft:entity.enderman.stare master @a ~ ~ ~ 2 1 1`,
                perPlayer: true
            },
            {
                repeat: 5,
                timeBetween: 1000,
                effect: function(j){return `particle minecraft:portal ~ ~${Math.round(18*(1-((j+5)/10)))+3} ~ 3 0.05 3 1 10000 force`;},
                perPlayer: true
            },
            {
                repeat: 1,
                timeBetween: 0,
                effect: `effect give @s nausea 30 1 true`,
                perPlayer: true
            },
            {
                repeat: 6,
                timeBetween: 1000,
                effect: `particle minecraft:portal ~ ~4 ~ 1 2 1 1 10000 force`,
                perPlayer: true
            },
            {
                repeat: 1,
                timeBetween: 0,
                effect: `playsound minecraft:block.portal.trigger master @a ~ ~ ~ 2 1 1`,
                perPlayer: true
            },
            {
                repeat: 4,
                timeBetween: 1000,
                effect: `particle minecraft:portal ~ ~4 ~ 1 2 1 1 10000 force`,
                perPlayer: true
            },
            {
                repeat: 1,
                timeBetween: 0,
                effect: `kill @s`,
                perPlayer: true
            }/*,
            {
                repeat: 1,
                timeBetween: 0,
                effect: `particle minecraft:portal ~ ~ ~ 10 10 10 1 10000 force`
                //effect: `execute as @e run effect give @s minecraft:levitation 99999 0`
            }*//*,
            {
                repeat: 15000, //15s
                timeBetween: 10,
                effect: `summon minecraft:tnt ~${Math.floor(Math.random()*201)-100} 255  ~${Math.floor(Math.random()*201)-100}`
            },*/
        ];
    
        Server.connect()
        .then(async () => {
            for(var i=0; i<destroyConfig.length; i++){
                var cur = destroyConfig[i];
                for(var j=0; j<cur.repeat; j++){
                    var command = '';
                    if(typeof cur.effect == 'string'){
                        command = cur.effect;
                    } else {
                        command = cur.effect(j);
                    }
                    if(cur.perPlayer){
                        command = 'execute as @a at @s run ' + command;
                    }
                    console.log('Running command: '+command);
                    await Promise.all([
                        Server.run(command),
                        timeout(cur.timeBetween)
                    ]);
                }
            }
            Server.close();
            resolve();
        })
        .catch((error) => {
            console.error(error);
            reject();
        });
    });
}

//Reset test world
resetWorld("C:\\Users\\gabri\\Documents\\Programming\\EndOfTheWorld\\Minecraft Server\\world", Server);