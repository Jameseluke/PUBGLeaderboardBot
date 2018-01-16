var Discord = require('discord.js');
var logger = require('winston');
var auth = require('./auth.json');
var Datastore = require('nedb');
var Table = require('easy-table');
var dateFormat = require('dateformat');

//logger configuration
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
  colorize: true
});
logger.level = 'debug';

//initialize discord bot
var bot = new Discord.Client();

//db configuration
const db = new Datastore({ filename: './data/users', autoload: true });

bot.on('ready', function (evt) {
  logger.info('Connected');
});

bot.on('message', function (message) {
  // listen for commands beginning with `!`
  if(message.author.bot) return;

  var content = message.content;
  if(content.substring(0,1) == '.'){
    var args = content.substring(1).split(' ');
    var cmd = args[0];
    args = args.splice(1);

    switch(cmd){
      case 'ping':
        message.reply('pong');
        break;
      case 'join':
        join(message);
        break;
      case 'set':
        set(message, args);
        break;
      case 'last':
        lastWin(message);
        break;
      case 'winner':
        winner(message);
        break;
      case 'cheater':
        break;
      case 'add':
        add(message);
        break;
      case 'leaderboard':
        leaderboard(message);
        break;
    }
  }
});

function join(message){
  var user = message.author;
  addUser(user.id, user.username, message.channel);
}

function set(message, args){
  if(!message.member.hasPermission('ADMINISTRATOR')){
    message.reply("you do not have permission to use this command");
    return;
  }
  var numWins = args[1];
  var user = message.mentions.users.first();
  if(user == undefined || isNaN(numWins) || numWins == ""){
    message.reply("whoops");
    return;
  }
  db.update({ id: user.id }, { $set: { wins: parseInt(numWins) } }, function(err, numReplaced){
    if(numReplaced > 0){
      message.channel.send(user.username + "'s wins set to " + numWins);
    }
  });
}

function leaderboard(message){
  var data = [];


  db.find({}).sort({ wins: -1, lastWin: 1 }).exec(function(err, docs){
    docs.forEach(function(doc){
      data.push({
        username: doc.username,
        wins: doc.wins,
        lastWin: dateFormat(new Date(doc.lastWin), "dd/mm/yyyy")
      });
    });
    /*var t = (new Table({'class': 'some-table'}))
        .setHeaders(headers) // see above json headers section
        .setData(data) // see above json data section
        .render()*/
    //var img = wkhtml.generate("<h1>Hello world</h1>").pipe(fs.createWriteStream('out.jpg'));

    var t = new Table;

    data.forEach(function(user) {
      t.cell('Player', user.username);
      t.cell('Wins  ', user.wins);
      //todo: fix this shit
      t.cell('Last Meal', user.lastWin);
      t.newRow();
    });
    message.channel.send("```" + t.toString() + "```");
  });
}

function add(message){
  var userlist = message.mentions.users; // Saving userlist to a variable
  userlist.forEach(function(user){
     addUser(user.id, user.username, message.channel);
  });
}

function lastWin(message){
  // todo: handle multiple users, and mentions
  db.find({id: message.author.id}, function (err, docs) {
    if(err){
      return null;
    }
    message.reply(lastWinMessage(docs[0].lastWin, "you"));
  });
}

function winner(message){
  var userlist = message.mentions.users; // Saving userlist to a variable
  userlist.forEach(function(user){
    db.update({ id: user.id }, { $inc: { wins: 1 }, $set: {lastWin: new Date()} }, function(err, numReplaced){
    });
  });
  message.channel.send("Winner Winner Chicken Dinner!!!");
}

function lastWinMessage(lastWinDate, username) {
    const minute = 1000 * 60;
    const hour = minute * 60;
    const day = hour * 24;

    var diff = Math.floor(Date.now() - lastWinDate.getTime());
    var days = Math.floor(diff/day);
    diff %= day;
    var hours = Math.floor(diff/hour);
    diff %= hour;
    var minutes = Math.floor(diff/minute);

    //todo: pretify, remove 0 values, add (s) for plural
    var message = username + " last ate ";
    message += days + " days, ";
    message += hours + " hours, and ";
    message += minutes + " minutes ago!"

    return message
}

function addUser(uid, uname, channel){
  db.find({ id: uid }, function (err, docs) {
    if(docs.length != 0){
      channel.send(uname + " is already on the leaderboard");
      return;
    }

    var doc = {
      id: uid,
      username: uname,
      wins: 0,
      lastWin: new Date(0)
    };

    db.insert(doc, function(err, newDocs){
      if(err){
        channel.send("An error occured, try again");
        return;
      }
      channel.send(uname + " was successfully added to the leaderboard");
    });
  });
}

bot.login(auth.token);
