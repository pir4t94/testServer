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

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

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
        var comment = req.body.comment;
        var mem = req.body.members;

        var trello = new Trello(devAPIkey, token);

        var description = 'OS: ' + os + '\nDevice: ' + device + '\nTime: ' + time + '\n\n' + desc;

        var files = req.files;

        console.log('Data was uploaded!');
        res.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8'});
        res.end('Data was uploaded!');

        var members = [];

        if(mem.length>10){
          if(mem.length>25){
            members = mem.split(',');
          }
          else{
            members.push(mem);
          }
        }

        members.forEach(member =>{
          console.log(member);
        })

        trello.getBoards('me', function(error, boards){
          if(error){
            console.log('Could not get boards', error);
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
                              }
                              else {
                                files.forEach( file => {
                                  trello.addAttachmentToCard(trelloCard.id, req.protocol + '://' + req.get('host') + '/uploads/' + file.filename, function (error, attachment) {
                                      if (error) {
                                        console.log('Could not add attachment', error);
                                      }
                                  });
                                });

                                trello.updateCard(trelloCard.id, "idAttachmentCover","",function(error, card){
                                  if(error){
                                    console.log('Could not set cover',error);
                                  }
                                });
                                if(desc.length<1)
                                  trello.addCommentToCard(trelloCard.id, comment, function(error, card){
                                    if(error){
                                      console.log('Could not add attachment',error);
                                    }
                                  });
                                members.forEach(member => {
                                  trello.addMemberToCard(trelloCard.id, member, function(error, member){
                                    if(error){
                                      console.log('Could not add member to card', error);
                                    }
                                  });
                                });
                              }
                            });
                    }else{
                      if(desc.length<1){
                        trello.addCommentToCard(cardName, comment, function(error, card){
                          if(error){
                            console.log('Could not add comment to card', error)
                          }
                        });
                        members.forEach(member => {
                          trello.addMemberToCard(trelloCard.id, member, function(error, member){
                            if(error){
                              console.log('Could not add member to card', error);
                            }
                          });
                        });
                        files.forEach( file => {
                          trello.addAttachmentToCard(cardName, req.protocol + '://' + req.get('host') + '/uploads/' + file.filename, function (error, attachment) {
                              if (error) {
                                console.log('Could not add attachment', error);
                              }
                          });
                        });
                      }else{
                        trello.updateCardDescription(cardName, desc, function(error, trelloCard){
                          if(error){
                            console.log('Could not update card\'s description', error);
                          }else{
                            files.forEach( file => {
                              trello.addAttachmentToCard(trelloCard.id, req.protocol + '://' + req.get('host') + '/uploads/' + file.filename, function (error, attachment) {
                                  if (error) {
                                    console.log('Could not add attachment', error);
                                  }
                              });
                            });
                            trello.updateCard(trelloCard.id, "idAttachmentCover","",function(error, card){
                              if(error){
                                console.log('Could not set cover', error);
                              }
                            });
                            members.forEach(member => {
                              trello.addMemberToCard(trelloCard.id, member, function(error, member){
                                if(error){
                                  console.log('Could not add member to card', error);
                                }
                              });
                            });
                          }
                        });
                      }
                    }
                  }else{
                    console.log('Could not find list', error);
                  }
                }
              });
            }else{
              console.log('Could not find board', error);
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

  trello.makeRequest('get','/1/members/me',{boards: 'all', board_fields: 'name,memberships', board_memberships: 'all', board_lists: 'all', cards: 'all'}).then((result) =>{
    var st = result.boards.length;
    var boards = result.boards;

    boards.forEach(board => {
      trello.makeRequest('get','/1/boards/' + board.id,{fields: 'name', lists: 'all', list_fields: 'idBoard,name', cards: 'all', card_fields: 'name,desc,idBoard,idList,idMembers', members: 'all', member_fields: 'username,fullName'}).then((board) =>{
        var lists = board.lists;
        var cards = board.cards;
        
        var b = {
          id: board.id,
          name: board.name,
          members: board.members,
          lists: board.lists
        }

        cards.forEach(card => {
          for(var i = 0; i < lists.length; i++){
            if(!lists[i].hasOwnProperty('cards'))
              lists[i].cards = [];
            if(lists[i].id == card.idList)
              lists[i].cards.push(card);
          }
        });

        var b = {
          id: board.id,
          name: board.name,
          members: board.members,
          lists: lists
        }

        resultArray.push(b);
        st--;
        if(st==0){
          res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
          return res.end(JSON.stringify(resultArray));
        }
      });
    });
  }).catch(function(){
    console.log('getBoards promise rejected!');
    res.end('[]');
  });
});

app.listen(port, function () {
  console.log('Listening on port ' + port + '!')
});

/*boards.forEach(board => {
  var b = {
    id: board.id,
    name: board.name,
    members: board.memberships,
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
    trello.makeRequest('get','/1/lists/' + l.id + '/cards',{fields: 'name,desc,idBoard,idList', members: true, member_fields: 'username,fullName'}).then((cards) =>{
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
});*/
