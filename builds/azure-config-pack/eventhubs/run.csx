#load "..\Handler.csx"
using System;

public static void Run(string myEvent, ILogger log, ExecutionContext context)
{

    Handler<string> handler = new Handler<string>();
    Response result = handler.execute(myEvent, log, context);
    log.LogInformation($"response: {result.ToString()}");
}
