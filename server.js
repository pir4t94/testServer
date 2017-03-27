var devAPIkey = '16f98e5f54b6e819539ad91482c1c21a';
var token = 'e48c599c01f977f97d3b9e9726e15b7302cfc9c4f01cf75a13724198cd61457c';
var teamID = 'testteam48951598'

var express = require('express');
var app = express();
var Trello = require('trello');
var trello = new Trello(devAPIkey, token);
var multer = require('multer');
var fs = require('fs');
var bodyParser = require('body-parser')

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
    var fileName = date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate() + '-' + date.getHours() + '-' + date.getMinutes() + '-' + date.getSeconds() + '-' + date.getMilliseconds() + '.' + file.originalname.split(".")[file.originalname.split(".").length-1];
    while(fs.existsSync('uploads/'+fileName)) {
      console.log("File exists!\nCreating new name...");
      date = new Date();
      fileName = date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate() + '-' + date.getHours() + '-' + date.getMinutes() + '-' + date.getSeconds() + '-' + date.getMilliseconds() + '.' + file.originalname.split(".")[file.originalname.split(".").length-1];
    }
    callback(null,fileName);
  }
});

var upload = multer({ storage : storage}).array('uFile',8)//.single('uFile');

app.get('/', function(req, res) {
  res.send("Hello");
});

app.post('/uploadData',function(req,res){
  console.log('Uploading...');
  date = new Date();
  upload(req,res,function(error) {
      if(error) {
        return res.end('Error uploading data');
      }else {

        var name = req.body.name;
        var user = req.body.user;
        var os = req.body.os;
        var device = req.body.device;
        var time = req.body.time;
        var desc = req.body.desc;

        var cardName = 'Bug Reporter';
        var description = 'User: ' + user + '\nOS: ' + os + '\nDevice: ' + device + '\nTime: ' + time + '\n\n' + desc;

        var files = req.files;

        trello.getOrgBoards(teamID, function(error, tBoards){
          if(error){
            console.log('Could not find board', error);
            return res.end("Could not find board");
          }else{
            tBoards.forEach(board => {
              if(board.name == name){
                var boardID = board.id;
                trello.getListsOnBoard(boardID, function(error, tLists){
                  if(error){
                    console.log('Could not get lists', error);
                    return res.end("Could not get lists");
                  }else{
                    var listID;
                    tLists.forEach(list => {
                      if(list.name.includes(os.split(' ')[0])){
                        listID = list.id;
                        trello.addCard(cardName, description, listID,
                            function (error, trelloCard) {
                                if (error) {
                                  console.log('Could not add card:', error);
                                  return res.end("Could not add card");
                                }
                                else {
                                  console.log('Added card:', trelloCard);
                                  const filesFolder = './uploads/';
                                  files.forEach( file => {
                                    trello.addAttachmentToCard(trelloCard.id, req.protocol + '://' + req.get('host') + '/uploads/' + file.filename, function (error, trelloCard) {
                                        if (error) {
                                          return res.end('Could not add card');
                                          console.log('Could not add Attachment:', error);
                                        }
                                        else {
                                          res.end('Data was uploaded');
                                          console.log('Added attachment');
                                        }
                                    });
                                  });
                               }
                          });
                      }
                    });
                    if(listID==null){
                      res.end('Could not find list');
                      console.log('Could not find list');
                    }
                  }
                });
              }
            });
          }
        });
      }
    });
});

app.listen(port, function () {
  console.log('Listening on port ' + port + '!')
});
