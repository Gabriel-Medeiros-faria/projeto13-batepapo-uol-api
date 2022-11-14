import express from "express"
import dotenv from "dotenv"
import { MongoClient } from "mongodb"
import dayjs from "dayjs"
import joi from "joi"
import Cors from "cors"

const app = express()
dotenv.config()
app.use(express.json())
app.use(Cors())

const participantsSchema = joi.object({
    name: joi.string().required().min(3)
})

const messagesSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().required()
})

const mongoClient = new MongoClient(process.env.MONGO_URI)

try {
    await mongoClient.connect()
    console.log("MongoDB conectado")
} catch (err) {
    console.log(err)
}

const db = mongoClient.db("batePapoUol")


//ROTAS
app.post("/participants", async (req, res) => {

    const { name } = req.body;
    const body = req.body
    const validation = participantsSchema.validate(body, { abortEarly: false });

    if (validation.error) {
        const errors = validation.error.details.map((detail) => detail.message);
        return res.status(422).send(errors);

    }

    try {
        const nome = await db.collection("participants").findOne({ name: name });
        if (nome) {
            res.sendStatus(409)
            return
        }
    } catch {

    }

    try {
        await db.collection("participants").insertOne({
            name: name,
            lastStatus: Date.now()
        });

        await db.collection("messages").insertOne({
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: `${dayjs().$H}:${dayjs().$m}:${dayjs().$s}`
        });

        res.status(201).send('usuario logado com sucesso!');
    } catch (err) {
        res.status(422).send(err)
    }

    // const {name} = req.body

    // try{
    //     await db.collection("participants").insertOne({name: name, lastStatus: Date.now()})
    //     await db.collection("messages").insertOne({from: name, 
    //         to: 'Todos', 
    //         text: 'entra na sala...', 
    //         type: 'status', 
    //         time: `${dayjs().$H}:${dayjs().$m}:${dayjs().$s}`})
    //     res.sendStatus(201)
    // }catch(err){
    //     console.log(err)
    //     res.sendStatus(500)
    // }
})

app.get("/participants", async (req, res) => {
    try {
        const participants = await db.collection("participants").find().toArray()
        res.send(participants)
    } catch (err) {
        console.log(err)
    }
})

app.post("/messages", async (req, res) => {
    const { to, text, type } = req.body
    const from = req.headers.user
    const validateUser = messagesSchema.validate(req.body, { abortEarly: false })

    try {
        const participants = await db.collection("participants").findOne({ name: from })
        if (!participants) {
            res.sendStatus(409)
            return
        }
        if (validateUser.error) {
            const erros = validateUser.error.details.map((obj) => obj.message)
            res.status(422).send(erros)
            return
        }

        await db.collection("messages").insertOne({ from, to, text, type, time: `${dayjs().$H}:${dayjs().$m}:${dayjs().$s}` })
        res.sendStatus(201)
    } catch (err) {
        res.status(422).send(err)
        console.log(err)
    }
})

app.get("/messages", async (req, res) => {
    const { limit } = req.query
    const { user } = req.headers

    try {
        const messages = await db.collection("messages").find().toArray()
        const messagesUser = messages.filter((obj) =>
            (obj.type === "message") ||
            (obj.to === "Todos") ||
            (obj.to === user && obj.type === "private_message") ||
            (obj.from === user))
        res.send(messagesUser.slice(-limit))
    } catch (err) {
        res.status(500).send(err)
        console.log(err)
    }
})


app.post("/status", async (req, res) => {
    const user = req.headers.user
    const userLocal = { name: user, lastStatus: Date.now() }
    try {
        const userNow = await db.collection("participants").findOne({ name: user })

        if (!userNow) {
            res.sendStatus(404)
            return
        }
        await db.collection("participants").updateOne({ _id: userNow._id }, { $set: userLocal })
        res.sendStatus(200)
    } catch (err) {
        res.sendStatus(500)
    }
})


setInterval(async () => {
    const dateNew = Date.now();
    try {
        const allParticipants = await db.collection("participants").find({}).toArray();
        const deletedParticipants = allParticipants.find((obj) => obj.lastStatus < dateNew - 15000)
        if (deletedParticipants) {
            await db.collection("participants").deleteOne({ name: deletedParticipants.name })
            await db.collection("messages").insertOne({
                from: deletedParticipants.name, 
                to: 'Todos', text: 'sai da sala...', 
                type: 'status', 
                time: `${dayjs().$H}:${dayjs().$m}:${dayjs().$s}`
            })
            console.log("deletado")
        }
    } catch { }
}, 15000);
/* setInterval(async ()=>{
const datenow = Date.now()
try{
    const allParticipants = await db.collection("paticipants").find({}).toArray()
    const deletedParticipants = allParticipants.find((obj)=> obj.lastStatus < datenow - 15000)
    if(deletedParticipants){
        await db.collection("participants").deleteOne({name: deletedParticipants.name})
        await db.collection("messages").insertOne({
            from: deletedParticipants.name,
            to: 'Todos',
            text: 'sai da sala...',
            type: 'status',
            time: `${dayjs().$H}:${dayjs().$m}:${dayjs().$s}`
        });
        console.log("deletado")
    }
}catch{
    console.log("erroooooooooo")
}
}, 15000) */

app.listen(process.env.PORT, () => console.log(`Está rodando na porta: ${process.env.PORT}`))