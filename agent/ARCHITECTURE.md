# LUMI Agent — Notas de Arquitectura

Documento interno para el equipo técnico. Recoge decisiones de diseño, advertencias, pendientes y el razonamiento detrás de cada módulo. No es un manual de uso — para eso ver `README.md`.

    vision general pipeline
```
[auth.log]          → SSHMonitor    ─┐
[nginx/access.log]  → HTTPMonitor   ─┼→ Queue(maxsize=1000) → Consumidor → SQLite → AgenteSender → Backend
[psutil / kernel]   → SystemMonitor ─┘
```

 Cada monitor corre en su propio hilo, el consumidor es el unico escritor de sqlite 


    mai.py el maestro de la orquesta

1- responsabilidad :
     arranca y apaga el agente de forma limpia, no contiene logica"
     
2- decisiones : 
     queue(maximo=1000) como back: si el consumidor se atrasa los monitores llegan a hacer drop, en lugar de comerse lla ram, el ecomerce tiene la prioridad sobre la telerimetria
     stopevent lo comparten todos los hilos, para que al momento de resibir crtl+c se aaguen de forma ordenada
     el orden de apagado : los monitores dejan de producir y se despues se vacia el consumidor, con este orden se previene el perder eventos
    joinn(timeout=10) si un hilo no termina en ese tiempo el procesose termina de todas formas para que un monitot que esta colgado blooque el apagado del server



core config - carga y validacion de la config



responsabilidad : 
    leer agent toml y ver que no arranque incompleta oinvalida

decisiones : 
    tomllib de stdblib (python 3.11) en otras versiones anteriores requiere ""#tomli# como dependencia externa esto leer el readme
    todos los errores usan raise fromm e , para preservar la cadena de exepcion original, en la v1 anterior se perdia la raiz, lo que dificultaba el diagnostico en produccion
    search path, en el mensaje en lugar de absolute, o solo el nombre resolve colapso  y el path real , que es lo que se necesita para ver el archivo 
    validacion con required keys, en lugar de otrso como jsonschema o pydantic ####(hablar con el equipo sobre esto )
    
    por que no jsonschema o xxxxxx : evalue para la estructura, tipos y rangos en una pasada, se descarta por que agrega una dependencia externa con un aumento de memoria significativo a comparacion de keys con aprox menos de 20 lineas sin     una dependencia externa ##(porfavvvvor consulta al equipo ) (pros : no dependes de algo externo menos uso de memoria)

    caso que en fases futuras necesite el validar rangos, retention days entre 1 y  67 dias o patrones  pydanti es la mejor opcion  lo justifica cuando la validacion se vuelve compleja

---


core-storage - buffer sqlite:

responsabilidad : guardar los eventos localmente hasta que se envien a david, o expiren por "retencion"

decisiones : 

wal : permite que david lea lo que el agente mande y que este escriba, ()
syncronous : ante un corte de luz o un impresito se pueden perder 1 o 2 (vueltas), de 5 segundos es mejor perder esto a que se corrompa la db
cahche: reducido desde que jess me dijo que teniamos un umbral para respetar el presupuesto del ecormece
write lock : es necesario para que david pueda leer desde otro hilo, peroooo un pero grande quita la proteccion de sql lite, este look hce que solo escriba
limitar pot tam : borra el 25% mas viejo y corre vacum cuando la db se exede, protege al disco ante ataques "masivos"

pendiente con equipo, pero salio, las ips legitimas se hashean? 
 

core logger - logging 

responsabilidad : configurar loggin, consol ay archivos rotativos

desiciones: 
rotation handler : maximo de 30 mb para logs, podria ser configurable por agent.toml si se ocupa
root handler: antes de los handlers  evita que se dupliquen mensajes, + llamandose mas de una ves haciendo que se vea mas aparatoso
formato : incluye nombre del modulo/monitor que genero cada linea sin leer todo 

monitors/system monitor - metricas :

responsabilidad : recolectar, cpu,ram,disco y procesos relevantes de cada ciclo + david pidio ips (creo)

decisiones: 

no requiere root psutil ya que genera/accede a los datos del user actual, para otros users si requieres
la primera llamada a psutil siempre manda 0.0, por que no tiene referencia previa, con quema
umbrales: ven los procesos en reposo y reducen el payload, solo se reportan aspectos que sobrepasan los umbrales, se pueden ajustar desde toml si lo piden
 

monitor ssh - detecta fuerza bruta: 

responsabilidad leer auth.log incrementalmente y detectar patrones 

patrones detectados : 
failed paswor for x from ip 
invalid user x from ip

por que estos 2?: 

almenos ahora failed pasword indica que el user existe y la contraseña es incorrecta 'obvio', que es un intenti de credencial/entrada directo mas grave, 
en ivalid user, el usuario no existe podria ser un ataque de diccionario, o un error de tipeo legiitimo, lo llevo como low por que genera mucho ruido

vista a largo plazo :: 

evaluar en auth.log, conetion closed by autenticator user ....., podria llegar a detectar escaneres de puertos que no llega a autenticar, que seria legitmo peroooo, cualquier cliente que se conecte y se desconecta antes de autenticarse lo tira lo que genera mas ruido aun y no estan los umbrales calibrados aun para eso

los umbrales de "errores de deo": 

corto = 3 : en 5 minutos un usuario legitmo escribe mal su contraseña 2 veces no dispara alerta (aun que deberia ser mas corto + ruido)
largo = 7 : en los 15 minutos detecta ataques mas lentos que intentan evadir el umbral corto, 
retraso de 1 minuto por ip o seria mejor llamarlo coldown?, para evitar spam de alertas aun que podria ser que hagan demasiadas y sea un gotero para filtrar el mar

decision - ventanas deslizantes : 

cada ip mantiene una deque con maxlen de 50, en acda ciclo se cuentam cuantos timestamp caen dentrp de esta ventana temporal, siendo 0(50) time por ciclo considero moderado por ahora espero noser demsiado conservador y que caldera lo reviente de ser asi considerade algo mas adecuado

** podria llegar a darse que si el agente se cayo y llega un "lote" de lineas todas se procesan con date now, podria disparar el umbral de rafaga artificialmete al arrancar generando falsos positivos 

monitor  / https - deteccion wordpress : 

responsabilidad: leer ngixs/acces.log  incrementalmente y detectar patrones de ataques 

detectores: 

ruta sensible word : wp_sensitive_route usando un match exacto para rutas conocidas, su severidad warning 
scaneres conocidos : scaner detected match contra lista de escaneres conocidos uas, severidad high
rafaga por ip : umbral = 20  peticiones por ip en un ciclo de lectura, severidad high 

advertencia wiu wiu : 

 no detecta wp-adm, ni admin-ajax, a futuro usar (anyrutas) escrito burdamente claro esta

senders - agent sender - tomar eventos del buffer yenviarselos a divid : 

responsabilidad: tomar eventos del buffer y mandarselos a david 

decisiones: 
retry con 4 intentos (4) 1,2,3,4,8 aclarando segundos, si el back esta caido, el agente no se bloquea guarda los datdos en local hasta resttablecer la conexion, (a futuro que hacer si no se puede conectar durante mucho tiempo)
dos endpoints con autentificacion diferente, url metrica con bearer, url alert con xinternalkey(canal interno), (si se cambia hay que cordinar)
mittre attk en send alerta, traduce event type,

antes dicho si no se establece conexion (con el back), el agente acumula en sqlite 



presupuesto esperado del agente v1 : 

lumi - 1< % - 25-30 mb ram 

futuros pendientes : 

agregar wpscan a escaneres 
intervalos independientes por monitor agent.toml (ver con david)

