/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework. 
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var config = require('./config');
var azurest = require('azure-storage');
var image2base64 = require('image-to-base64');
var axios = require('axios');
var botbuilder_azure = require("botbuilder-azure");

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


// El díalogo principal inicia aquí
bot.dialog('/', [
    function (session) {
        // Primer diálogo  
        session.beginDialog('card1');  
        time = setTimeout(() => {
            session.endConversation(`**Lo sentimos ha transcurrido el tiempo estimado para completar esta actividad. Intentalo nuevamente.**`);
        }, 300000);
    },
    
    function (session) {
        var valor = session.message.value;
        console.log(valor);
        
        // session.dialogData.ticket = results.response;
        session.dialogData.sysID = '';
        axios.get(

            config.url + "/v2/table/incident?number=" + valor.ticket,
            {headers:{"Accept":"application/json","Content-Type":"application/json","Authorization": ("Basic " + new Buffer(config.snaccount).toString('base64'))}}
        
        ).then((data)=>{
        
            var result = data.data.result[0];
            console.log(result);
            
            session.dialogData.sysID = data.data.result[0].sys_id;
            //console.log(" Título:", data.data.result );
            axios.get(
                config.url + "/attachment?sysparm_query=table_sys_id=" + session.dialogData.sysID + "&sysparm_limit=10",       
                 {headers:{"Accept":"application/json","Content-Type":"application/json","Authorization": ("Basic " + new Buffer(config.snaccount).toString('base64'))}}
            ).then((data1)=>{
                //Devuelve el número de archivos adjuntos 
                var xcount = data1.headers["x-total-count"];
                // session.send(` Título: **${result.subcategory}** \n Descripción: **${result.short_description}** \n Creado por: **${result.sys_created_by}** \n Creado el: **${result.sys_created_on}** \n Última actualización: **${result.sys_updated_on}** \n Resuelto el: **${result.resolved_at}** \n Archivos adjuntos: **${xcount}**`);
                
                
                axios.get(
                    config.url+"/v2/table/core_company/" + result.company.value,
                    {headers:{"Accept":"application/json","Content-Type":"application/json","Authorization": ("Basic " + new Buffer(config.snaccount).toString('base64'))}}
                
                ).then((core)=>{
                    var company = core.data.result.name;
            session.dialogData.company = company;
                // CODE GOES HERE
                    console.log("core_company: "+ company);
                    console.log("data: "+ result.subcategory);
                    var info = new builder.Message(session)
                    .addAttachment({
                        contentType: "application/vnd.microsoft.card.adaptive",
                        content:{
                                    "type": "AdaptiveCard",
                                    "body": [
                                        {
                                            "type": "ColumnSet",
                                            "columns": [
                                                {
                                                    "type": "Column",
                                                    "verticalContentAlignment": "Center",
                                                    "items": [
                                                        {
                                                            "type": "Image",
                                                            "horizontalAlignment": "Left",
                                                            "spacing": "None",
                                                            "url": "http://blog.orb-data.com/wp-content/uploads/2016/05/service-now-logo.png",
                                                            "size": "Large"
                                                        }
                                                    ],
                                                    "width": "stretch"
                                                },
                                                {
                                                    "type": "Column",
                                                    "items": [
                                                        {
                                                            "type": "TextBlock",
                                                            "text": "No de Ticket"
                                                        },
                                                        {
                                                            "type": "TextBlock",
                                                            "size": "Large",
                                                            "color": "Accent",
                                                            "text": valor.ticket
                                                        }
                                                    ],
                                                    "width": "stretch"
                                                }
                                            ]
                                        },
                                        {
                                            "type": "TextBlock",
                                            "size": "Medium",
                                            "weight": "Bolder",
                                            "text": "Información del ticket",
                                            "wrap": true
                                        },
                                        {
                                            "type": "FactSet",
                                            "facts": [
                                                {
                                                    "title": "Proyecto",
                                                    "value": company
                                                },
                                                {
                                                    "title": "Titulo",
                                                    "value": result.subcategory
                                                },
                                                {
                                                    "title": "Descripcion",
                                                    "value": result.short_description
                                                },
                                                {
                                                    "title": "Creado por",
                                                    "value": result.sys_created_by
                                                },
                                                {
                                                    "title": "Creado el",
                                                    "value": result.sys_created_on
                                                },
                                                {
                                                    "title": "Última actualización",
                                                    "value": result.sys_updated_on
                                                },
                                                {
                                                    "title": "Resuelto el",
                                                    "value": result.resolved_at
                                                },
                                                {
                                                    "title": "Archivos adjuntos",
                                                    "value": xcount
                                                }
                                            ]
                                        }
                                    ],
                                    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                                    "version": "1.0"
                                }
                                }); //Finaliza Atachment
                
                                session.send(info);
                                // for (let i = 0; i < xcount; i++) {
                                //     var element = data1.data.result[i].file_name +"\n";
                                    
                                //     session.send(element);
                                    
                                //     // devuelve los nombres de los archivos adjuntos
                                //     // session.send(element);
                                // }
                                builder.Prompts.choice(session, '¿Esta información es correcta?', [Choice.Si, Choice.No], { listStyle: builder.ListStyle.button });
                                // console.log("Attachments: ",data1.headers["x-total-count"]);
                                // console.log("1: ",data1.data.result[0].file_name);
                                // console.log("2: ",data1.data.result[1].file_name);
                // CODE ENDS HERE
                }).catch((e)=>{
                    console.log("error", e.toString());
                    
                });
                
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
            session.endConversation("Por favor valida con tu contacto de soporte Mainbit que el **Número de Ticket** sea correcto");
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
        console.log("Session_Company "+session.dialogData.company);
        
        var msg = session.message;
        console.log('MSG: ' + msg);
        
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
                            config.attachUrl + session.dialogData.sysID + '&file_name='+session.dialogData.company+"_"+ session.dialogData.tipo +'.'+ ctype,
                            buffer,
                            {headers:{"Accept":"application/json","Content-Type":attachment.contentType,"Authorization": ("Basic " + new Buffer(config.snaccount).toString('base64'))}}
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
                            {headers:{"Accept":"application/json","Content-Type":attachment.contentType,"Authorization": ("Basic " + new Buffer(config.snaccount).toString('base64'))}}
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
bot.dialog('card1', 
 
 function (session) {
        var mensaje ='Por favor llena todos los datos';
        var faltaserie ='Por favor llena los datos de la serie';
        var faltaasociado ='Por favor llena los datos de la serie';
    // Primer diálogo    
    if (session.message.value && session.message.value.ticket) {
        // A Card's Submit Action obj was received
        var valor = session.message.value;
        console.log(valor);
        console.log(session.message.value);
        session.endDialog(session);
        // next();
        return;
    
    }
    
    var msg1 = new builder.Message(session)
    .addAttachment({
    contentType: "application/vnd.microsoft.card.adaptive",
    content: {
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "type": "AdaptiveCard",
        "version": "1.0",
        "body": [
            {
                "type": "ColumnSet",
                "columns": [
                    {
                        "type": "Column",
                        "items": [
                            {
                                "type": "Image",
                                
                                "url": "data:image/jpeg;base64,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",
                                "size": "Medium"
                            }
                        ],
                        "width": "auto"
                    },
                    {
                        "type": "Column",
                        "items": [
                            {
                                "type": "Image",
                                "style": "Person",
                                "url": "https://saprdblobs0x027055087467.blob.core.windows.net/partners/RES/solutions/images/servicenow.png",
                                "size": "Medium"
                            }
                        ],
                        "width": "auto"
                    },
                    {
                        "type": "Column",
                        "items": [
                            {
                                "type": "TextBlock",
                                "size": "medium",
                                "text": ""
                            }
                        ],
                        "width": "stretch"
                    }
                ]
            },
            {
                "type": "TextBlock",
                "text": "Bienvenido al Servicio Automatizado de Mainbit.",
                "weight": "bolder"   
            },
            {
                "type": "TextBlock",
                "text": "**Sugerencia:** Recuerda que puedes cancelar en cualquier momento escribiendo **cancelar.**",
                "wrap": true
                },
                {
                    "type": "TextBlock",
                    "text": "**Importante:** este bot tiene un ciclo de vida de 10 minutos.",
                    "wrap": true
            },
            {
                "type": "TextBlock",
                "text": "No Ticket ServiceNow",
                "weight": "bolder",
                "wrap": true
                },
            {
                "type": "Input.Text",
                "id": "ticket",
                "placeholder": "Número de ticket"
                }
        ],
        "actions": [
            {
                "type": "Action.Submit",
                "title": "Enviar",
                "data": {
                    
                }
            }
        ]
    }
    });
session.send(msg1);



}
 
);