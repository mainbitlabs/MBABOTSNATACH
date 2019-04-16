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
                                
                                "url": "https://raw.githubusercontent.com/esanchezlMBT/images/master/logo-512.jpg",
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
                                "url": "https://raw.githubusercontent.com/esanchezlMBT/images/master/servicenow.png",
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