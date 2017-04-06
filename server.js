var devAPIkey = '16f98e5f54b6e819539ad91482c1c21a';
//var token = 'e48c599c01f977f97d3b9e9726e15b7302cfc9c4f01cf75a13724198cd61457c';
var teamID = 'testteam48951598';

var express = require('express');
var app = express();
var Trello = require('trello');
var multer = require('multer');
var fs = require('fs');
var bodyParser = require('body-parser');

var port=Number(process.env.PORT || 3000);
var date = new Date();

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(bodyParser.json());


app.use('/uploads', express.static(__dirname + '/uploads'));

var storage =   multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './uploads');
  },
  filename: function (req, file, callback) {
    date = new Date();
    var fileName = date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate() + '-' + date.getHours() + '-' + date.getMinutes() + '-' + date.getSeconds() + '-' + date.getMilliseconds() + '.' + file.originalname.split(".")[file.originalname.split(".").length-1];
    while(fs.existsSync('uploads/'+fileName)) {
      console.log("File exists!\nCreating new name...");
      date = new Date();
      fileName = date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate() + '-' + date.getHours() + '-' + date.getMinutes() + '-' + date.getSeconds() + '-' + date.getMilliseconds() + '.' + file.originalname.split(".")[file.originalname.split(".").length-1];
    }
    callback(null,fileName);
  }
});

var upload = multer({ storage : storage}).array('uFile',8);

app.get('/', function(req, res) {
  res.send("Hello");
});

app.get('/getToken', function(req, res) {

});

app.post('/uploadData',function(req,res){
  console.log('Uploading...');
  upload(req,res,function(error) {
      if(error) {
        return res.end('Error uploading data');
      }else {

        var token = req.body.token;
        var boardName = req.body.boardName;
        var listName = req.body.listName;
        var cardName = req.body.cardName;
        var newCard = req.body.newCard;
        var os = req.body.os;
        var device = req.body.device;
        var time = req.body.time;
        var desc = req.body.desc;

        var trello = new Trello(devAPIkey, token);

        //cardName = 'Bug Reporter';
        var description = 'OS: ' + os + '\nDevice: ' + device + '\nTime: ' + time + '\n\n' + desc;

        var files = req.files;

        trello.getBoards('me', function(error, boards){
          if(error){
            console.log('Could not get boards', error);
            return res.end('Could not get boards');
          }else{
            var boardId = '';

            boards.forEach(board => {
              if(board.name == boardName)
                boardId = board.id
            });

            if(boardId != ''){
              trello.getListsOnBoard(boardId, function(error, lists){
                if(error){
                  console.log('Could not get lists', error);
                  return res.end('Could not get lists');
                }else{
                  var listId = '';
                  lists.forEach(list => {
                    if(list.name == listName)
                      listId = list.id;
                  });

                  if(listId != ''){
                    if(newCard == 'true'){
                      trello.addCard(cardName, description, listId,
                          function (error, trelloCard) {
                              if (error) {
                                console.log('Could not add card', error);
                                return res.end('Could not add card');
                              }
                              else {
                                const filesFolder = './uploads/';
                                files.forEach( file => {
                                  trello.addAttachmentToCard(trelloCard.id, req.protocol + '://' + req.get('host') + '/uploads/' + file.filename, function (error, attachment) {
                                      if (error) {
                                        return res.end('Could not add attachment');
                                        console.log('Could not add attachment', error);
                                      }
                                  });
                                });

                                trello.updateCard(trelloCard.id, "idAttachmentCover","",function(error, card){
                                  if(error){
                                    res.end('Could not set cover');
                                    console.log('Could not set cover');
                                  }else{
                                    res.end('Data was uploaded!');
                                    console.log('Data was uploaded!');
                                  }
                                });
                              }
                            });
                    }else{
                      trello.updateCardDescription(cardName, desc, function(error, trelloCard){
                        if(error){
                          console.log('Could not update card\'s description', error);
                          return res.end('Could not update card\'s description');
                        }else{
                          files.forEach( file => {
                            trello.addAttachmentToCard(trelloCard.id, req.protocol + '://' + req.get('host') + '/uploads/' + file.filename, function (error, attachment) {
                                if (error) {
                                  return res.end('Could not add attachment');
                                  console.log('Could not add attachment', error);
                                }
                            });
                          });
                          trello.updateCard(trelloCard.id, "idAttachmentCover","",function(error, card){
                            if(error){
                              res.end('Could not set cover');
                              console.log('Could not set cover');
                            }else{
                              res.end('Data was uploaded!');
                              console.log('Data was uploaded!');
                            }
                          });
                        }
                      });
                    }

                    /**/
                  }else{
                    console.log('Could not find list', error);
                    return res.end('Could not find list');
                  }
                }
              });
            }else{
              console.log('Could not find board', error);
              return res.end('Could not find board');
            }
          }
        });
      }
    });
});

app.get('/getBoards',function(req,res){
  console.log('Getting boards...');

  var token = req.query.token;

  if(token == null)
    return res.end('No token');

  var trello = new Trello(devAPIkey, token);

  var resultArray = [];

  trello.makeRequest('get','/1/members/me',{boards: 'all', board_lists: 'all', cards: 'all'}).then((result) =>{
    var st = 0;
    var boards = result.boards;
    boards.forEach(board => {
      var b = {
        id: board.id,
        name: board.name,
        lists: []
      }
      var lists = board.lists;
      st += lists.length;
      lists.forEach(list => {
        var l = {
          id: list.id,
          name: list.name,
          boardId: list.idBoard,
          cards: []
        }
        trello.makeRequest('get','/1/lists/' + l.id + '/cards',{fields: 'name,desc,idBoard,idList'}).then((cards) =>{
          st--;
          l.cards = cards;
          if(st==0){
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(resultArray));
          }
        }).catch(function(){
          console.log('getCards promise rejected!');
          res.end('[]');
        });
        b.lists.push(l);
      });
      resultArray.push(b);
    });
  }).catch(function(){
    console.log('getBoards promise rejected!');
    res.end('[]');
  });
});

app.get('/getCards',function(req, res){
  console.log('Getting boards...');

  var token = req.query.token;

  if(token == null)
    return res.end('No token');

  var trello = new Trello(devAPIkey, token);

  var resultArray = [];
});

/*var cards = result.cards;
cards.forEach(card => {
  if(l.id == card.idList){
    console.log(card.name);
    var c = {
      id: card.id,
      name: card.name,
      listId: card.idList,
      boardId: card.idBoard
    }
    l.cards.push(c);
  }
});*/

app.listen(port, function () {
  console.log('Listening on port ' + port + '!')
});
