
const express = require("express")
const app = express();
var bodyParser = require('body-parser');

var json2xls = require('json2xls');
const fs = require("fs");
const multer = require("multer");
const path = require('path');
const cors = require('cors');
const axios = require('axios');

const csv = require("csvtojson");
const excelToJson = require('convert-excel-to-json');

app.use(cors())
app.use(express.static('public'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


app.set('view engine', 'ejs');

app.get("/", function (req, res) {
    res.render('upload');
});


var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "__" + file.originalname)
    }
});

var upload = multer({ storage: storage }).single('filename');

let finalData;
let filename;
let templatedata;
let filedir;
let filepath;
let newfilename;
let newfilepath;
templatedata = JSON.parse(fs.readFileSync(__dirname + '\\' + 'excelConfig.json'));

app.post("/upload", upload, function (req, res) {
    
    // console.log(templatedata);
    filename = req.file.filename
    let file = filename.split('.')
    let fileextn = file[file.length - 1]
    console.log(filename,"filename");
    newfilename = file[0]+"_backup."+fileextn;
    filepath = path.join(__dirname, './uploads', filename)
    newfilepath = path.join(__dirname,'./backup',newfilename);
    // console.log(filepath);
    filedir = '/uploads';
    console.log(filedir,"filedir");
    /*to read csv file */

    if (fileextn === 'csv') {
        async function readcsvFile(filename) {
            csv()
                .fromFile(filename)
                .then(async (jsonObj) => {
                    // console.log(jsonObj);
                    finalData = jsonObj
                    res.render('result', { data: jsonObj })
                })
                .catch((err) => {
                    console.log(err.message);
                });
        }
        readcsvFile(filepath);
    }
    else if (fileextn === 'xlsx') {
        let jsonObj = excelToJson({
            sourceFile: filepath,
            columnToKey: {
                "*": "{{columnHeader}}"
            }
        })
        jsonObj.Sheet1.shift();
        console.log(jsonObj.Sheet1,"sheet1");
        finalData = jsonObj;
       
        res.render('result', { data: jsonObj.Sheet1, headers: templatedata,filename:filename,filedir:filedir })
    }

    else {
        res.render('error')
    }

});


app.get("/edit", upload, function (req, res) {
    let val = req.query.value
    // console.log(val);

    console.log(finalData.Sheet1,"sheet1 array");
   if(val){
    // finalData.Sheet1
    // console.log(templatedata);
    res.render('edit', { data: finalData.Sheet1[val],val:val, headers: templatedata })
   }
   else{
    res.render('new',{ headers:templatedata})
   }
});


app.get('/upload', (req, res) => {
    let search = req.query.search;
    console.log(search,"search");
    

    let searchData ;
    if(search){
        searchData = finalData.Sheet1.filter(item => item.Scenario_ID.includes(search));
        console.log(searchData,"finalData from search");
        if(searchData){
            res.render('result', { data: searchData, headers: templatedata,filename:filename,filedir:filedir });
        }
    }
    else{
        res.render('result', { data: finalData.Sheet1, headers: templatedata,filename:filename,filedir:filedir });
    }
    
})

app.use(json2xls.middleware);
app.get('/save', (req, res) => {
   try{
    var xls = json2xls(finalData.Sheet1);
    console.log("save api called");
    fs.rename(filepath,newfilepath,(err)=>{
        if(err){
            console.log(err,"from upload api while moving file");
        }
    }).then(
        fs.writeFileSync(filepath, xls,"binary"));
    

    res.status(200).send("file created");
   }
   catch(err){
    res.status(500).send(err,"error from save api")

   }
})




app.post("/form",function(req,res){
   if(req.query.value){
    let val = req.query.value;
    console.log(req.body.Execution,"edit form ","val :",val);

    if(req.body){
        for(let i in templatedata){
            console.log(i,"i from templatedata");
            if(templatedata[i].editable=="true" ){
                if(req.body[i]){
                    finalData.Sheet1[val][i] = req.body[i];
                }
                
            }
        }
        console.log(finalData.Sheet1[val],"updated values");
    }
    
    res.render('result', { data: finalData.Sheet1, headers: templatedata,filename:filename,filedir:filedir});
   }
   else{
    finalData.Sheet1.push(req.body);
    console.log(finalData,"final data after new record");
    // res.xls('data.xlsx', finalData.Sheet1);

    res.render('result', { data: finalData.Sheet1, headers: templatedata ,filename:filename,filedir:filedir});
   }

  
  });



app.listen(3001, function () {
    console.log('Server running on port 3001');
});

