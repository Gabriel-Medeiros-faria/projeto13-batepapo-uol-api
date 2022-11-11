import express from "express"
import dotenv from "dotenv"
import { MongoClient } from "mongodb"


const app = express()
dotenv.config()
app.use(express.json())

const mongoClient = new MongoClient(process.env.MONGO_URI)

try{
    await mongoClient.connect()
    console.log("MongoDB conectado")
}catch(err){
    console.log(err)
}

const db = mongoClient.db("batePapoUol")


//ROTAS
app.post("/participants", async (req, res)=>{
    const {nome} = req.body
    if(!nome){
        res.sendStatus(400)
        return
    }

    try{
        await db.collection("participants").insertOne(req.body)
        res.sendStatus(201)
    }catch(err){
        console.log(err)
        res.sendStatus(500)
    }
    
})

app.get("/participants", async (req, res)=>{
    try{
        const participants = await db.collection("participants").find().toArray()
        res.send(participants)
    }catch(err){
        console.log(err)
    }
    
})


app.listen(process.env.PORT, ()=> console.log(`Está rodando na porta: ${process.env.PORT}`))