const express = require('express')
const app = express()
const dotenv = require("dotenv")
dotenv.config()
const PORT = process.env.PORT || 3000
const path = require("path")
const ejs = require("ejs")
const expressLayout = require("express-ejs-layouts")
const mongoose = require("mongoose")
const flash = require("express-flash")
const session = require("express-session");
const MongoDbStore = require("connect-mongo")
const passport = require("passport")
const Emitter = require("events");



mongoose.connect(process.env.MONGO_URL , {
    useNewUrlParser : true ,
    useUnifiedTopology : true
}).then(()=> {
    console.log("Mongodb connected")
}).catch((err) => {
    console.log("Error in connecting mongoose - "+err);
})

//event emitter
const eventEmitter = new Emitter();
app.set('eventEmitter' , eventEmitter);


app.use(session({
    secret: "mynameissameer",
    resave :false,
    store : MongoDbStore.create({
        mongoUrl : process.env.MONGO_URL
    }),
    saveUninitialized:false,
    cookie :  { maxAge: 1000*24*60*60 } //24 hrs
}))

//passport config 
require("./app/config/passport")(passport);
app.use(passport.initialize());
app.use(passport.session());


//set template engine
app.use(flash())
app.use(express.static("public"))
app.use(expressLayout);
app.set("views" , path.join(__dirname , "/resources/views"));
app.set("view engine" , "ejs");
app.use(express.json()); //for requesting json data
app.use(express.urlencoded({extended : false})) //for requesting array string obejcts 

//global middleware
app.use((req,res,next)=> {
    res.locals.session = req.session;
    res.locals.user = req.user;
    next();
})

require("./routes/web")(app);


const server = app.listen(PORT , ()=> {
    console.log(`Listening on port ${PORT}`)
})

const io = require('socket.io')(server);

io.on('connection' , (socket) => {
    socket.on('join' , (roomName)=> {
        socket.join(roomName);
    })
})

eventEmitter.on('orderUpdated', (data)=> {
    io.to(`order_${data.id}`).emit('orderUpdated' ,data);
})

eventEmitter.on('orderPlaced' , (data)=> {
    io.to('adminRoom').emit('orderPlaced' , data)
})