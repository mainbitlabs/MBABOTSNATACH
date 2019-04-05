/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var config = require('./config');
var azurest = require('azure-storage');
var image2base64 = require('image-to-base64');
var axios = require('axios');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata 
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot. 
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */

var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot(connector);
bot.set('storage', tableStorage);

var Choice = {
    Si: 'Sí',
    No: 'No'
 };

var Opts = {
    Resguardo : 'Resguardo',
    Check: 'Check',
    Borrado: 'Borrado',
    Baja: 'Baja'
 };
 
 var time;
// Variable Discriptor para actualizar tabla
var Discriptor = {};
// El díalogo principal inicia aquí
bot.dialog('/', [
    function (session) {
        // Primer diálogo    
        session.send(`Hola bienvenido al Servicio Automatizado de Mainbit.`);
        session.send(`**Sugerencia:** Recuerda que puedes cancelar en cualquier momento escribiendo **"cancelar".** \n\n **Importante:** este bot tiene un ciclo de vida de 5 minutos, te recomendamos concluir la actividad antes de este periodo.`);
        builder.Prompts.text(session, '¿Cuál es el número de ticket de **ServiceNow** que deseas revisar?');
        time = setTimeout(() => {
            session.endConversation(`**Lo sentimos ha transcurrido el tiempo estimado para completar esta actividad. Intentalo nuevamente.**`);
        }, 300000);
    },
    
    function (session, results) {
        session.dialogData.ticket = results.response;
        session.dialogData.sysID = '';
        axios.get(

            config.url + session.dialogData.ticket,
            {headers:{"Accept":"application/json","Content-Type":"application/json","Authorization": ("Basic " + new Buffer(config.snaccount).toString('base64'))}}
        
        ).then((data)=>{
        
            var result = data.data.result[0];
            session.dialogData.sysID = data.data.result[0].sys_id;
            //console.log(" Título:", data.data.result );
            axios.get(
                "https://mainbitdev1.service-now.com/api/now/attachment?sysparm_query=table_sys_id="+session.dialogData.sysID+"&sysparm_limit=10",       
                 {headers:{"Accept":"application/json","Content-Type":"application/json","Authorization": ("Basic " + new Buffer(config.snaccount).toString('base64'))}}
            ).then((data1)=>{
                //Devuelve el número de archivos adjuntos 
                var xcount = data1.headers["x-total-count"];
                session.send(` Título: **${result.subcategory}** \n Descripción: **${result.short_description}** \n Creado por: **${result.sys_created_by}** \n Creado el: **${result.sys_created_on}** \n Última actualización: **${result.sys_updated_on}** \n Resuelto el: **${result.resolved_at}** \n Archivos adjuntos: **${xcount}**`);
                for (let i = 0; i < xcount; i++) {
                    var element = data1.data.result[i].file_name +"\n";
                    
                    session.send(element);
                    
                    // devuelve los nombres de los archivos adjuntos
                    // session.send(element);
                }
                builder.Prompts.choice(session, 'Hola ¿Esta información es correcta?', [Choice.Si, Choice.No], { listStyle: builder.ListStyle.button });
                // console.log("Attachments: ",data1.headers["x-total-count"]);
                // console.log("1: ",data1.data.result[0].file_name);
                // console.log("2: ",data1.data.result[1].file_name);
            }
            ).catch( (e)=>{
                console.log("error2", e.toString()); 
            }
            );
        }).catch((e)=>{
            console.log("error",e.toString());
            session.endDialog("**Error: Los datos son incorrectos, intentalo nuevamente.**");
        });
    },
    function (session, results) {
        // Cuarto diálogo
        var selection = results.response.entity;
        switch (selection) {
            
            case Choice.Si:
            builder.Prompts.choice(session, '¿Deseas adjuntar Evidencia o Documentación?', [Choice.Si, Choice.No], { listStyle: builder.ListStyle.button });
            break;

            case Choice.No:
            clearTimeout(time);
            session.endConversation("Por favor valida con tu soporte que el **Número de Ticket** sea correcto");
            break;
        }
        
    },
    function (session, results) {
        // Cuarto diálogo
        var selection3 = results.response.entity;
        switch (selection3) {
            
            case Choice.Si:
            builder.Prompts.choice(session, '¿Que tipo de Evidencia o Documentación?', [Opts.Resguardo, Opts.Check, Opts.Borrado, Opts.Baja], { listStyle: builder.ListStyle.button });  
            break;

            case Choice.No:
            clearTimeout(time);
            session.endConversation("**De acuerdo, hemos terminado por ahora**");
            break;
        }
        
    },
    function (session, results) {
        // Quinto diálogo
        var selection2 = results.response.entity;
        session.dialogData.tipo = selection2;
        session.dialogData.Discriptor ={};
        switch (selection2) {

            case Opts.Resguardo:
            builder.Prompts.attachment(session, `**Adjunta aquí ${Opts.Resguardo}**`);
            break;

            case Opts.Borrado:
            builder.Prompts.attachment(session, `**Adjunta aquí ${Opts.Borrado}**`);
            break;

            case Opts.Baja:
            builder.Prompts.attachment(session, `**Adjunta aquí ${Opts.Baja}**`);
            break;

            case Opts.Check:
            builder.Prompts.attachment(session, `**Adjunta aquí ${Opts.Check}**`);
            break;
        }
        
    },
    function (session, results) {
        var msg = session.message;
        if (msg.attachments && msg.attachments.length > 0) {
         // Echo back attachment
         var attachment = msg.attachments[0];
            session.send({
                "attachments": [
                  {
                    "contentType": attachment.contentType,
                    "contentUrl": attachment.contentUrl,
                    "name": attachment.name
                  }
                ],});
                var stype = attachment.contentType.split('/');
                var ctype = stype[1];
                var url = attachment.contentUrl;
                console.log(attachment.contentUrl);
                image2base64(url)
                .then(
                    (response) => {
                        // console.log(response); //iVBORw0KGgoAAAANSwCAIA...
                        var buffer = new Buffer(response, 'base64');
                        axios.post(
                            config.attachUrl + session.dialogData.sysID + '&file_name='+session.dialogData.tipo +'.'+ ctype,
                            buffer,
                            {headers:{"Accept":"application/json","Content-Type":attachment.contentType,"Authorization": ("Basic " + new Buffer(config.snaccount).toString('base64'))}},
                        ).then((data)=>{
                        console.log('done'+ data.data.result);
                        session.send(`El archivo **${session.dialogData.tipo}.${ctype}** se ha subido correctamente`);
                        builder.Prompts.choice(session, '¿Deseas adjuntar Evidencia o Documentación?', [Choice.Si, Choice.No], { listStyle: builder.ListStyle.button });

                        }).catch((error)=>{
                            console.log("error",error.toString());
                        });
                    }
                )
                .catch(
                    (error) => {
                        console.log(error); //Exepection error....
                    }
                );
        
        // acaba if
         } else {
            // Echo back users text
            session.send("You said: %s", session.message.text);
        }

    },
    function (session, results) {
        // Cuarto diálogo
        var selection3 = results.response.entity;
        switch (selection3) {
            
            case Choice.Si:
            builder.Prompts.choice(session, '¿Que tipo de Evidencia o Documentación?', [Opts.Resguardo, Opts.Check, Opts.Borrado, Opts.Baja], { listStyle: builder.ListStyle.button });  
            break;

            case Choice.No:
            clearTimeout(time);
            session.endConversation("De acuerdo, hemos terminado por ahora");
            break;
        }
        
    },
    function (session, results) {
        // Quinto diálogo
        var selection2 = results.response.entity;
        session.dialogData.tipo = selection2;
        session.dialogData.Discriptor ={};
        switch (selection2) {

            case Opts.Resguardo:
            function appendResguardo() {
                Discriptor.PartitionKey = {'_': session.dialogData.asociado, '$':'Edm.String'};
                Discriptor.RowKey = {'_': session.dialogData.serie, '$':'Edm.String'};
                Discriptor.Resguardo = {'_': 'Resguardo Adjunto', '$':'Edm.String'};
            };
            appendResguardo();
            builder.Prompts.attachment(session, `**Adjunta aquí ${Opts.Resguardo}**`);
            break;

            case Opts.Borrado:
            function appendBorrado() {
                Discriptor.PartitionKey = {'_': session.dialogData.asociado, '$':'Edm.String'};
                Discriptor.RowKey = {'_': session.dialogData.serie, '$':'Edm.String'};
                Discriptor.Borrado = {'_': 'Borrado Adjunto', '$':'Edm.String'};
            };
            appendBorrado();
            builder.Prompts.attachment(session, `**Adjunta aquí ${Opts.Borrado}**`);
            break;

            case Opts.Baja:
            function appendBaja() {
                Discriptor.PartitionKey = {'_': session.dialogData.asociado, '$':'Edm.String'};
                Discriptor.RowKey = {'_': session.dialogData.serie, '$':'Edm.String'};
                Discriptor.Baja = {'_': 'Baja Adjunto', '$':'Edm.String'};
            };
            appendBaja();
            builder.Prompts.attachment(session, `**Adjunta aquí ${Opts.Baja}**`);
            break;

            case Opts.Check:
            function appendCheck() {
                Discriptor.PartitionKey = {'_': session.dialogData.asociado, '$':'Edm.String'};
                Discriptor.RowKey = {'_': session.dialogData.serie, '$':'Edm.String'};
                Discriptor.Check = {'_': 'Check Adjunto', '$':'Edm.String'};
                
            };
            appendCheck();
            builder.Prompts.attachment(session, `**Adjunta aquí ${Opts.Check}**`);
            break;
        }
        
    },
    function (session, results) {
    // Sexto diálogo
        var msg = session.message;
        if (msg.attachments && msg.attachments.length > 0) {
         // Echo back attachment
         var attachment = msg.attachments[0];
            session.send({
                "attachments": [
                  {
                    "contentType": attachment.contentType,
                    "contentUrl": attachment.contentUrl,
                    "name": attachment.name
                  }
                ],});
                var stype = attachment.contentType.split('/');
                var ctype = stype[1];
                var url = attachment.contentUrl;
                console.log(attachment.contentUrl);
                image2base64(url)
                .then(
                    (response) => {
                        // console.log(response); //iVBORw0KGgoAAAANSwCAIA...
                        var buffer = new Buffer(response, 'base64');
                        axios.post(
                            config.attachUrl + session.dialogData.sysID + '&file_name='+session.dialogData.tipo +'.'+ ctype,
                            buffer,
                            {headers:{"Accept":"application/json","Content-Type":attachment.contentType,"Authorization": ("Basic " + new Buffer(config.snaccount).toString('base64'))}},
                        ).then((data)=>{
                        console.log('done'+ data.data.result);
                        session.send(`El archivo **${session.dialogData.tipo}.${ctype}** se ha subido correctamente`);
                        session.endConversation('Hemos terminado por ahora. \n Saludos. ');
                        clearTimeout(time);
                        }).catch((error)=>{
                            console.log("error",error.toString());
                        });
                    }
                )
                .catch(
                    (error) => {
                        console.log(error); //Exepection error....
                    }
                );
        
        // acaba if
         } else {
            // Echo back users text
            session.send("You said: %s", session.message.text);
        }

    }
]);
// Cancela la operación en cualquier momento
bot.dialog('cancel',
    function (session) {
        clearTimeout(time);
        session.endConversation('No hay problema, volvamos a iniciar de nuevo.');
        session.replaceDialog('/');
    }
).triggerAction(
    {matches: /(cancel|cancelar)/gi}
);