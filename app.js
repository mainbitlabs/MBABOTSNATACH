var restify = require('restify');
var builder = require('botbuilder');
var config = require('./config');
var azurest = require('azure-storage');
var image2base64 = require('image-to-base64');
var nodeoutlook = require('nodejs-nodemailer-outlook');
var axios = require('axios');
var botbuilder_azure = require("botbuilder-azure");
var locationDialog = require('botbuilder-location');
var tableService = azurest.createTableService(config.storageA, config.accessK);
var blobService = azurest.createBlobService(config.storageA,config.accessK);

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

var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);

// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot(connector);
bot.library(locationDialog.createLibrary("AgOQtTJyu9UTgaiqsjNjWnqSFI9pXHo6r1kGEh7seV9jNj4PhJyXKgaUKu37x_zQ"));
bot.set('storage', tableStorage);

var Choice = {
    Si: 'Sí',
    No: 'No'
 };
 var Docs = {
    Evidencia: 'Adjuntar Documentación',
    Incidente: 'Reportar Incidente'
 };
var Opts = {
    Resguardo : 'Resguardo',
    Check: 'Check',
    Borrado: 'Borrado',
    Baja: 'Baja',
    HS: 'HojadeServicio',
    Ubicacion: 'Reportar llegada a Sitio',
 };
 var Motivos = {
    Uno: 'Usuario',
    Dos: 'Documentos',
    Tres: 'Infraestructura',
    Cuatro: 'Equipo',
    Cinco: 'Servicio',
 };
 var time;

// El díalogo principal inicia aquí
bot.dialog('/', [
    function (session) {
        // Primer diálogo            
        var msg1 = new builder.Message(session)
        .addAttachment({
        contentType: "application/vnd.microsoft.card.adaptive",
        content: {
            "type": "AdaptiveCard",
            "body": [
                {
                    "type": "ColumnSet",
                    "columns": [
                        {
                            "type": "Column",
                            "horizontalAlignment": "Center",
                            "items": [
                                {
                                    "type": "Image",
                                    "horizontalAlignment": "Center",
                                    "spacing": "None",
                                    "url": "https://raw.githubusercontent.com/esanchezlMBT/images/master/logo-512.jpg",
                                    "size": "Large"
                                }
                            ],
                            "width": "stretch"
                        },
                        {
                            "type": "Column",
                            "horizontalAlignment": "Center",
                            "items": [
                                {
                                    "type": "Image",
                                    "horizontalAlignment": "Center",
                                    "spacing": "None",
                                    "url": "https://raw.githubusercontent.com/esanchezlMBT/images/master/servicenow.png",
                                    "size": "Large"
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
                    "text": "Bienvenido al Servicio Automatizado de Mainbit."
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
                }
            ],
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
            "version": "1.0"
        }
            
        
        });
    session.send(msg1);
    builder.Prompts.text(session, '¿Cuál es el número de ticket de **ServiceNow** que deseas revisar?');
        time = setTimeout(() => {
            session.endConversation(`**Lo sentimos ha transcurrido el tiempo estimado para completar esta actividad. Intentalo nuevamente.**`);
        }, 600000);
    },
    
    function (session, results) {
        // Segundo diálogo
        // Envíamos un mensaje al usuario para que espere.
        session.sendTyping();
        session.send('Estamos atendiendo tu solicitud. Por favor espera un momento...');
        session.privateConversationData.ticket = results.response;
        session.privateConversationData.sysID = '';
        axios.get(

            config.url+ "/table/incident?number=" + session.privateConversationData.ticket,
            {headers:{"Accept":"application/json","Content-Type":"application/json","Authorization": ("Basic " + Buffer.from(config.snaccount).toString('base64'))}}
        
        ).then((data)=>{
        
        
            var result = data.data.result[0];
            // console.log(result);
            
            session.privateConversationData.sysID = data.data.result[0].sys_id;
            //console.log(" Título:", data.data.result );
            axios.get(
                config.url + "/attachment?sysparm_query=table_sys_id=" + session.privateConversationData.sysID + "&sysparm_limit=10",       
                 {headers:{"Accept":"application/json","Content-Type":"application/json","Authorization": ("Basic " + Buffer.from(config.snaccount).toString('base64'))}}
            ).then((data1)=>{
                //Devuelve el número de archivos adjuntos 
                var xcount = data1.headers["x-total-count"];
                // session.send(` Título: **${result.subcategory}** \n Descripción: **${result.short_description}** \n Creado por: **${result.sys_created_by}** \n Creado el: **${result.sys_created_on}** \n Última actualización: **${result.sys_updated_on}** \n Resuelto el: **${result.resolved_at}** \n Archivos adjuntos: **${xcount}**`);
                
                axios.get(
                    config.url+"/table/core_company/" + result.company.value,
                    {headers:{"Accept":"application/json","Content-Type":"application/json","Authorization": ("Basic " + Buffer.from(config.snaccount).toString('base64'))}}
                
                ).then((core)=>{
                    var company = core.data.result.name;
            session.privateConversationData.company = company;
            session.privateConversationData.titulo = result.subcategory;
                // CODE GOES HERE
                    console.log("core_company: "+ company);
                    console.log("typeof_company: "+ typeof(company));
                    console.log("data: "+ result.subcategory);
                    var info = new builder.Message(session)
                    .addAttachment({
                        contentType: "application/vnd.microsoft.card.adaptive",
                        content:{
                                    "type": "AdaptiveCard",
                                    "body": [
                                        {
                                            "type": "ColumnSet",
                                            "spacing": "None",
                                            "height": "stretch",
                                            "columns": [
                                                {
                                                    "type": "Column",
                                                    "spacing": "None",
                                                    "height": "stretch",
                                                    "verticalContentAlignment": "Center",
                                                    "items": [
                                                        {
                                                            "type": "Image",
                                                            "horizontalAlignment": "Left",
                                                            "spacing": "None",
                                                            "height": "stretch",
                                                            "url": "http://blog.orb-data.com/wp-content/uploads/2016/05/service-now-logo.png",
                                                            "size": "Large"
                                                        }
                                                    ],
                                                    "width": "stretch"
                                                },
                                                {
                                                    "type": "Column",
                                                    "spacing": "None",
                                                    "height": "stretch",
                                                    "items": [
                                                        {
                                                            "type": "TextBlock",
                                                            "spacing": "None",
                                                            "height": "stretch",
                                                            "text": "No de Ticket"
                                                        },
                                                        {
                                                            "type": "TextBlock",
                                                            "spacing": "None",
                                                            "height": "stretch",
                                                            "size": "Large",
                                                            "color": "Accent",
                                                            "text": session.privateConversationData.ticket
                                                        }
                                                    ],
                                                    "width": "stretch"
                                                }
                                            ]
                                        },
                                        {
                                            "type": "TextBlock",
                                            "spacing": "None",
                                            "height": "stretch",
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
                                //     devuelve los nombres de los archivos adjuntos
                                //     session.send(element);
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
        // Tercer diálogo
        var selection = results.response.entity;
        switch (selection) {
            
            case Choice.Si:
            builder.Prompts.choice(session, '¿Qué deseas realizar?', [Docs.Evidencia, Docs.Incidente], { listStyle: builder.ListStyle.button });
            // INSERTA O CREA UNA ENTIDAD EN AZURE STORAGE
            
            var insert={
                PartitionKey : {'_': session.privateConversationData.company , '$':'Edm.String'},
                RowKey : {'_':session.privateConversationData.ticket, '$':'Edm.String'} 
            };

            tableService.insertOrMergeEntity(config.table1, insert, function (error, result, response) {
                if (!error) {
                    console.log("Entidad creada en Azure Storage"); 
                }
            });
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
            
            case Docs.Evidencia:
            builder.Prompts.choice(session, '¿Que tipo de Evidencia o Documentación?', [Opts.Resguardo, Opts.Check, Opts.Borrado, Opts.Baja, Opts.HS, Opts.Ubicacion], { listStyle: builder.ListStyle.button });  
            break;

            case Docs.Incidente:
                session.beginDialog("incidente");
                break;
        }
        
    },
    function (session, results) {
        // Quinto diálogo
        var selection2 = results.response.entity;
        session.privateConversationData.tipo = selection2;
        session.privateConversationData.Discriptor ={};
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
            
            case Opts.HS:
                builder.Prompts.attachment(session, `**Adjunta aquí ${Opts.HS}**`);
            break;
            
            case Opts.Ubicacion:
                    // session.send("[Ubicación actual](https://mainbitlabs.github.io/)");
                    session.send("Comparte tu ubicación actual");
                session.beginDialog('location');
            break;

            case Motivos.Uno:
            session.privateConversationData.X = Motivos.Uno;
             // Comentar detalles de Servicio Pospuesto
            builder.Prompts.text(session, 'Escribe tus observaciones');
             break;

            case Motivos.Dos:
            session.privateConversationData.X = Motivos.Dos;
            // Comentar detalles de Servicio Pospuesto
            builder.Prompts.text(session, 'Escribe tus observaciones');
            break;
            
            case Motivos.Tres:
            session.privateConversationData.X = Motivos.Tres;
            // Comentar detalles de Servicio Pospuesto
            builder.Prompts.text(session, 'Escribe tus observaciones');
            break;
        
            case Motivos.Cuatro:
            session.privateConversationData.X = Motivos.Cuatro;
            // Comentar detalles de Servicio Pospuesto
            builder.Prompts.text(session, 'Escribe tus observaciones');
            break;
            
            case Motivos.Cinco:
            session.privateConversationData.X = Motivos.Cinco;
            // Comentar detalles de Servicio Pospuesto
            builder.Prompts.text(session, 'Escribe tus observaciones');
            break;
        }
        
    },
    function (session, results) {
        // Sexto diálogo
        session.privateConversationData.comentarios = results.response;
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
                        var buffer = Buffer.from(response, 'base64');
                        // Attachment to Blob Storage
                        blobService.createBlockBlobFromText(config.blobcontainer, session.privateConversationData.company+'_'+session.privateConversationData.ticket+'_'+session.privateConversationData.tipo+'.'+ctype, buffer,  function(error, result, response) {
                            if (!error) {
                               
                               
                                // Attachment to ServiceNow
                                axios.post(
                                    config.attachUrl + session.privateConversationData.sysID + '&file_name=' + session.privateConversationData.company + '_' + session.privateConversationData.ticket + '_' + session.privateConversationData.tipo +'.'+ ctype,
                                    buffer,
                                    {headers:{"Accept":"application/json","Content-Type":attachment.contentType,"Authorization": ("Basic " + Buffer.from(config.snaccount).toString('base64'))}}
                                ).then((data)=>{
                                console.log('done'+ data.data.result);
                                session.send(`El archivo **${session.privateConversationData.company}_${session.privateConversationData.ticket}_${session.privateConversationData.tipo}.${ctype}** se ha subido correctamente`);
                                builder.Prompts.choice(session, '¿Deseas adjuntar Evidencia o Documentación?', [Choice.Si, Choice.No], { listStyle: builder.ListStyle.button });
                                // SEND EMAIL
                                
                                }).catch((error)=>{
                                    console.log("error",error.toString());
                                });
                            }
                            else{
                                console.log('Hubo un error: '+ error);
                                
                            }
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
             var rk = session.privateConversationData.ticket;
             var pk = session.privateConversationData.company;
             console.log(session.privateConversationData);
             console.log(pk, typeof(pk));
             console.log(rk, typeof(rk));
             
            tableService.retrieveEntity(config.table1, pk, rk, function(error, result, response) {
                if (!error) {
                    // SI COMENTARIOS NO EXISTE
                    if (!result.Comentarios) {
                        console.log("Comentarios No Existe");
                        console.log(" >> MAILER",session.privateConversationData);
                        // Correo de notificaciones 
                        nodeoutlook.sendEmail({
                            auth: {
                                user: `esanchezl@mainbit.com.mx`,
                                pass: `Kokardo04`,
                            }, from: `esanchezl@mainbit.com.mx`,
                            to: `esanchezl@mainbit.com.mx `,
                            subject: `${session.privateConversationData.company} Incidente de ${session.privateConversationData.X}: ${session.privateConversationData.ticket} / ${session.privateConversationData.X}`,
                            html: `<p>El servicio se pospuso por el siguiente motivo:</p><br><b>${session.privateConversationData.X}</b><br><b><blockquote>${session.privateConversationData.comentarios}</blockquote></b><br><b>Proyecto: ${session.privateConversationData.company}</b><br><b>Ticket: ${session.privateConversationData.ticket}</b><br><b>Titulo: ${session.privateConversationData.titulo}</b>`
                        });
                        // Comentarios
                        console.log(" >> MERGE",session.privateConversationData);
                        var dateNow = new Date().toLocaleString();
                        var comentarios = {
                            PartitionKey : {'_': session.privateConversationData.company, '$':'Edm.String'},
                            RowKey : {'_': session.privateConversationData.ticket, '$':'Edm.String'},
                            Comentarios : {'_':dateNow +' '+session.privateConversationData.X +' '+ session.privateConversationData.comentarios, '$':'Edm.String'}
                            
                        };
                            
                            tableService.mergeEntity(config.table1, comentarios, function(error, res, respons) {
                                if (!error) {
                                    console.log(`entity property ${session.privateConversationData.tipo} updated`);
                                
                                }
                                else{
                                    console.log("<< Error MERGE ENTITY >>", error);
                                    clearTimeout(time);
                                    session.endConversation("**Error MERGE ENTITY.**");
                                }
                            });
                       clearTimeout(time);
                       session.endConversation("**Hemos terminado por ahora, Se enviarán tus observaciones por correo.**");
                    } else {
                    // SI COMENTARIOS EXISTE
                    console.log("Comentarios SI Existe");
                        console.log(" >> RESULT COMENTARIOS", result.Comentarios._);
                        console.log(" >> MAILER", session.privateConversationData);
                        // Correo de notificaciones 
                        nodeoutlook.sendEmail({
                            auth: {
                                user: `esanchezl@mainbit.com.mx`,
                                pass: `Kokardo04`,
                            }, from: `esanchezl@mainbit.com.mx`,
                            to: `esanchezl@mainbit.com.mx `,
                            subject: `${session.privateConversationData.company} Incidente de ${session.privateConversationData.X}: ${session.privateConversationData.ticket} / ${session.privateConversationData.X}`,
                            html: `<p>El servicio se pospuso por el siguiente motivo:</p><br><b>${session.privateConversationData.X}</b><br><b><blockquote>${session.privateConversationData.comentarios}</blockquote></b><br><b>Proyecto: ${session.privateConversationData.company}</b><br><b>Ticket: ${session.privateConversationData.ticket}</b><br><b>Titulo: ${session.privateConversationData.titulo}</b>`
                        });
                        // Comentarios
                        console.log(" >> MERGE",session.privateConversationData);
                        var dateNow = new Date().toLocaleString();
                        var comentarios = {
                            PartitionKey : {'_': session.privateConversationData.company, '$':'Edm.String'},
                            RowKey : {'_': session.privateConversationData.ticket, '$':'Edm.String'},
                            Comentarios : {'_':dateNow +' '+session.privateConversationData.X +' '+ session.privateConversationData.comentarios+'\n'+result.Comentarios._, '$':'Edm.String'}
                            
                        };
                            
                            tableService.mergeEntity(config.table1, comentarios, function(error, res, respons) {
                                if (!error) {
                                    console.log(`entity property ${session.privateConversationData.tipo} updated`);
                                
                                }
                                else{
                                    console.log("<< Error MERGE ENTITY >>", error);
                                    clearTimeout(time);
                                    session.endConversation("**Error MERGE ENTITY.**");
                                }
                            });
                       clearTimeout(time);
                       session.endConversation("**Hemos terminado por ahora, Se enviarán tus observaciones por correo.**");
                    }
                   
                }
                else{
                    console.log("<< Error RETRIEVE ENTITY 2>>", error);
                    clearTimeout(time);
                    session.endConversation("**Error  RETRIEVE ENTITY 2.**"); 
                }
            });
        }

    },
    function (session, results) {
        // Séptimo diálogo
        var selection3 = results.response.entity;
        switch (selection3) {
            
            case Choice.Si:
            builder.Prompts.choice(session, '¿Que tipo de Evidencia o Documentación?', [Opts.Resguardo, Opts.Check, Opts.Borrado, Opts.Baja, Opts.HS, Opts.Ubicacion], { listStyle: builder.ListStyle.button });  
            break;

            case Choice.No:
            clearTimeout(time);
            session.endConversation("De acuerdo, hemos terminado por ahora");
            break;
        }
        
    },
    function (session, results) {
        // Octavo diálogo
        var selection2 = results.response.entity;
        session.privateConversationData.tipo = selection2;
        session.privateConversationData.Discriptor ={};
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
            
            case Opts.HS:
                builder.Prompts.attachment(session, `**Adjunta aquí ${Opts.HS}**`);
            break;
            
            case Opts.Ubicacion:
                session.beginDialog('location');
                // session.send("[Ubicación actual](https://mainbitlabs.github.io/)");
            break;
        }
        
    },
    function (session, results) {
    // Noveno diálogo
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
                        var buffer = Buffer.from(response, 'base64');
                        // Attachment to BlobStorage
                        blobService.createBlockBlobFromText(config.blobcontainer, session.privateConversationData.company+'_'+session.privateConversationData.ticket+'_'+session.privateConversationData.tipo+'.'+ctype, buffer,  function(error, result, response) {
                            if (!error) {
                               
                               
                                // Attachment to ServiceNow
                                axios.post(
                                    config.attachUrl + session.privateConversationData.sysID + '&file_name=' + session.privateConversationData.company + '_' + session.privateConversationData.ticket + '_' + session.privateConversationData.tipo +'.'+ ctype,
                                    buffer,
                                    {headers:{"Accept":"application/json","Content-Type":attachment.contentType,"Authorization": ("Basic " + Buffer.from(config.snaccount).toString('base64'))}}
                                ).then((data)=>{
                                console.log('done'+ data.data.result);
                                session.send(`El archivo **${session.privateConversationData.company}_${session.privateConversationData.ticket}_${session.privateConversationData.tipo}.${ctype}** se ha subido correctamente`);
                                clearTimeout(time);
                                session.endConversation('Hemos terminado por ahora. \n Saludos. ');
                                
                                }).catch((error)=>{
                                    console.log("error",error.toString());
                                });
                            }
                            else{
                                console.log('Hubo un error: '+ error);
                                
                            }
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

bot.dialog("location", [
    function (session) {
       
       if (session.message.text == "") { 
        //    console.log("<<< Imposible >>>", session.message.entities);
        console.log("<<< core_company: "+ session.privateConversationData.company);
        console.log("<<< typeof_company: "+ typeof(session.privateConversationData.company));
           console.log("<<< Session.message >>>", session.message);
           console.log("<<< Latitude >>>", session.message.entities[0].geo.latitude);
           console.log("<<< Longitude >>>", session.message.entities[0].geo.longitude);
           var d = new Date();
            var m = d.getMonth() + 1;
            var fecha = d.getFullYear() + "-" + m + "-" + d.getDate() + "-" + d.getHours() + ":" + d.getMinutes() + ":" + d.getSeconds();
            var descriptor = {
                PartitionKey: {'_': session.privateConversationData.company, '$':'Edm.String'},
                RowKey: {'_': session.privateConversationData.ticket, '$':'Edm.String'},
                Fecha: {'_': fecha, '$':'Edm.String'},
                Latitud: {'_': session.message.entities[0].geo.latitude, '$':'Edm.String'},
                Longitud: {'_': session.message.entities[0].geo.longitude, '$':'Edm.String'},
                Historico: {'_': fecha +" "+ session.message.entities[0].geo.latitude + " " + session.message.entities[0].geo.longitude+"\n", '$':'Edm.String'},
                Url: {'_': 'https://www.google.com.mx/maps/search/ '+ session.message.entities[0].geo.latitude + "," + session.message.entities[0].geo.longitude, '$':'Edm.String'},
            };
            tableService.insertOrMergeEntity(config.table1, descriptor, function(error, result, response) {
                if (!error) {
setTimeout(() => {
    
    tableService.retrieveEntity(config.table1, session.privateConversationData.company, session.privateConversationData.ticket, function(error, result, response) {
        if (!error) {
            var historico = result.Historico._;
            var merge = {
                PartitionKey: {'_': session.privateConversationData.company, '$':'Edm.String'},
                RowKey: {'_': session.privateConversationData.ticket, '$':'Edm.String'},
                Historico: {'_': historico + "\n" + fecha +" "+ session.message.entities[0].geo.latitude + " " + session.message.entities[0].geo.longitude, '$':'Edm.String'},
            };
            setTimeout(() => {

                tableService.mergeEntity(config.table1, merge, function(err, res, respons) {
                    if (!err) {
                       console.log("Merge Entity Historico");
                       clearTimeout(time);
                       session.endConversation("Gracias, tu ubicación ha sido registrada.");
                    }
                    else{err} 
                });
                
            }, 2000);
    
        } else {
            console.log(error);
            
        }
    }
    
    );
}, 2000);

                    
                }else{
                    console.log(error);
                    
                }
            });
            
       } 
    }
    
]);
function getFormattedAddressFromPlace(place, separator) {
    var addressParts = [place.streetAddress, place.locality, place.region, place.postalCode, place.country];
    return addressParts.filter(i => i).join(separator);
}
bot.dialog('incidente',
    function (session, next) {
        builder.Prompts.choice(session, `**Elije el motivo por el cual se pospone el servicio.**`,[Motivos.Uno, Motivos.Dos, Motivos.Tres, Motivos.Cuatro, Motivos.Cinco], { listStyle: builder.ListStyle.button });
    }
 );