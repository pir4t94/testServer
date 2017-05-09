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
        var boardId = req.body.boardId;
        var listId = req.body.listId;
        var cardId = req.body.cardId;
        var newCard = req.body.newCard;
        var os = req.body.os;
        var device = req.body.device;
        var time = req.body.time;
        var desc = req.body.desc;
        var comment = req.body.comment;
        var mem = req.body.members;
        var lbls = req.body.labels;
        /*var checkListName = req.body.checkListName;
        var checkListItms = req.body.checkListItms;*/

        var checklists;

        try{
          checklists = JSON.parse(req.body.checklists);
        }catch(){
          checklists = [];
        }


        var trello = new Trello(devAPIkey, token);

        var description = 'OS: ' + os + '\nDevice: ' + device + '\nTime: ' + time + '\n\n' + desc;

        var files = req.files;

        console.log('Data was uploaded!');
        res.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8'});
        res.end('Data was uploaded!');

        var members = [];
        var labels = [];
        //var items = [];

        if(mem!=null){
          if(mem.length>10){
            if(mem.length>25){
              members = mem.split(',');
            }
            else{
              members.push(mem);
            }
          }
        }
        if(lbls!=null){
          if(lbls.length>10){
            if(lbls.length>25){
              labels = lbls.split(',');
            }
            else{
              labels.push(lbls);
            }
          }
        }
/*if(checkListItms!=null){
        if(checkListItms.length>0){
          if(checkListItms.split(',').length>1){
            items = checkListItms.split(',');
          }else{
            items.push(checkListItms);
          }
        }}*/

        if(newCard == 'true'){
          trello.addCard(cardId, description, listId,
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
                    labels.forEach(label => {
                      trello.addLabelToCard(trelloCard.id, label, function(error, card){
                        if(error){
                          console.log('Could not add label to card', error);
                        }
                      });
                    });
                    checklists.forEach(checklist =>{
                      trello.addChecklistToCard(trelloCard.id, checklist.name, function(error, cl){
                        if(error){
                          console.log('Could not add checklist', error);
                        }else{
                          var items = checklist.items;
                          items.forEach(item => {
                            trello.makeRequest('post','/1/checklists/' + cl.id + '/checkitems',{name:item.name,checked:item.state}).then((result) =>{
                            });
                          });
                        }
                      });
                    });
                  }
                });
        }else{
          if(desc!=null){
          if(desc.length<1){
            trello.addCommentToCard(cardId, comment, function(error, card){
              if(error){
                console.log('Could not add comment to card', error)
              }
            });
            trello.makeRequest('put','/1/cards/' + cardId + '/idMembers',{value: members.join(',')}).then((result) =>{
            });
            labels.forEach(label => {
              trello.makeRequest('put','/1/cards/' + cardId,{idLabels: labels.join(',')}).then((result) =>{
              });
            });
            files.forEach( file => {
              trello.addAttachmentToCard(cardId, req.protocol + '://' + req.get('host') + '/uploads/' + file.filename, function (error, attachment) {
                  if (error) {
                    console.log('Could not add attachment', error);
                  }
              });
            });
            checklists.forEach(checklist =>{
              if(checklist.id.length < 1){
                trello.addChecklistToCard(cardId, checklist.name, function(error, cl){
                  if(error){
                    console.log('Could not add checklist', error);
                  }else{
                    var items = checklist.items;
                    items.forEach(item => {
                      trello.makeRequest('post','/1/checklists/' + cl.id + '/checkitems',{name:item.name,checked:item.state}).then((result) =>{
                      });
                    });
                  }
                });
              }else{
                var items = checklist.items;
                items.forEach(item => {
                  if(item.id.length < 1){
                    trello.makeRequest('post','/1/checklists/' + cl.id + '/checkitems',{name:item.name,checked:item.state}).then((result) =>{
                    });
                  }else{
                    trello.makeRequest('put','/1/cards/' + cardId + '/checklist/' + cl.id + '/checkItem/' + item.id,{state:item.state}).then((result) =>{
                    });
                  }
                });
              }
            });
          }else{
            trello.updateCardDescription(cardId, desc, function(error, trelloCard){
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
                trello.makeRequest('put','/1/cards/' + trelloCard.id + '/idMembers',{value: members.join(',')}).then((result) =>{
                });
                labels.forEach(label => {
                  trello.makeRequest('put','/1/cards/' + trelloCard.id,{idLabels: labels.join(',')}).then((result) =>{
                  });
                });
                checklists.forEach(checklist =>{
                  if(checklist.id.length < 1){
                    trello.addChecklistToCard(cardId, checklist.name, function(error, cl){
                      if(error){
                        console.log('Could not add checklist', error);
                      }else{
                        var items = checklist.items;
                        items.forEach(item => {
                          trello.makeRequest('post','/1/checklists/' + cl.id + '/checkitems',{name:item.name,checked:item.state}).then((result) =>{
                          });
                        });
                      }
                    });
                  }else{
                    var items = checklist.items;
                    items.forEach(item => {
                      if(item.id.length < 1){
                        trello.makeRequest('post','/1/checklists/' + checklist.id + '/checkitems',{name:item.name,checked:item.state}).then((result) =>{
                        });
                      }else{
                        trello.makeRequest('put','/1/cards/' + cardId + '/checklist/' + checklist.id + '/checkItem/' + item.id,{state:item.state}).then((result) =>{
                        });
                      }
                    });
                  }
                });
              }
            });
          }}
        }
      }
    });
});

app.get('/getBoards',function(req,res){
  console.log('Getting boards...');

  var token = req.query.token;

  if(token == null){
    res.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'});
    return res.end('No token');
  }

  var trello = new Trello(devAPIkey, token);

  trello.makeRequest('get','/1/members/me',{boards: 'all', board_fields: 'name'}).then((result) =>{
    var st = result.boards.length;
    result.boards.forEach(board => {
      trello.makeRequest('get','/1/boards' + '/' + board.id,{labels: 'all', label_fields:'color,name'}).then((result2) =>{
        result.boards.forEach(board => {
          if(board.id == result2.id){
            board.labels = result2.labels;
          }
        });
        if(st-- == 1){
          res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
          return res.end(JSON.stringify(result.boards));
        }
      });
    });
  });
});

app.get('/getLists',function(req,res){
  console.log('Getting lists...');

  var token = req.query.token;
  var boardId = req.query.boardId;

  if(token == null){
    res.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'});
    return res.end('No token');
  }

  var trello = new Trello(devAPIkey, token);

  trello.makeRequest('get','/1/boards/' + boardId + '/lists',{fields: 'name,idBoard'}).then((lists) =>{
    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
    return res.end(JSON.stringify(lists));
  });
});

app.get('/getCards',function(req,res){
  console.log('Getting cards...');

  var token = req.query.token;
  var listId = req.query.listId;

  if(token == null){
    res.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'});
    return res.end('No token');
  }

  var trello = new Trello(devAPIkey, token);

  trello.makeRequest('get','/1/lists/' + listId + '/cards',{fields:'name,desc,boardId,idMembers,idLabels'}).then((cards) =>{
    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
    return res.end(JSON.stringify(cards));
  });
});

app.get('/getChecklists',function(req,res){
  console.log('Getting checklists...');

  var token = req.query.token;
  var cardId = req.query.cardId;

  if(token == null){
    res.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'});
    return res.end('No token');
  }

  var trello = new Trello(devAPIkey, token);

  trello.makeRequest('get','/1/cards/' + cardId + '/checklists',{card_fields:'',checkItem_fields:'name,state',fields:'idCard,name'}).then((cards) =>{
    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
    return res.end(JSON.stringify(cards));
  });
});

app.get('/getMembers',function(req,res){
  console.log('Getting members...');

  var token = req.query.token;
  var boardId = req.query.boardId;

  if(token == null){
    res.writeHead(500, {'Content-Type': 'application/json; charset=utf-8'});
    return res.end('No token');
  }

  var trello = new Trello(devAPIkey, token);

  trello.makeRequest('get','/1/boards/' + boardId + '/members',{}).then((members) =>{
    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
    return res.end(JSON.stringify(members));
  });
});

app.listen(port, function () {
  console.log('Listening on port ' + port + '!')
});
