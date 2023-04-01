//LiteLoaderScript Dev Helper
/// <reference path="c:\Users\yq\Desktop\BAK\LLSE-Aids-Library/dts/HelperLib-master/src/index.d.ts"/> 

let _VER = [1,1,0]

// 文件名：EconomicSync.lxl.js
// 文件功能：LLSE平台下经济自动同步工具
// 作者：yqs112358
// 首发平台：MineBBS

// Helper
String.prototype.replaceAll = function(f,t)
{
    let reg = new RegExp(f,"g");
    return this.replace(reg,t); 
}

let conf = new IniConfigFile("./plugins/EconomicSync/config.ini", "");
logger.setTitle("EconomicSync");

function CheckScoreboard()
{
    let economic = conf.getStr("Main","ScoreboardName","money");
    if(mc.getScoreObjective(economic) == null)
    {
        if(!mc.newScoreObjective(economic,economic))
            logger.warn("经济记分板创建失败！");
        else
            logger.info("同步经济记分板 '" + economic + "' 已创建");
    }
}

function SyncMoney(pl)
{
    let scoreName = conf.getStr("Main","ScoreboardName","money");
    let score = pl.getScore(scoreName);
    let mon = money.get(pl.xuid);

    if(score != mon)
    {
        if(conf.getStr("Main","MainEconomic") == "Scoreboard")
            money.set(pl.xuid, score);
        else
            pl.setScore(scoreName,mon);
    }
}

function ChangeMessage(pl, value)
{
    let infoStr = conf.getStr("Info","ChangeMessage");
    if(infoStr.trim() != "")
    {
        infoStr = infoStr.replaceAll("%%Money%%",String(value));
        pl.sendText(infoStr);
    }
}

let skip = false;

mc.listen("onScoreChanged",function(pl,num,name,displayName)
{
    if(skip)
    {
        skip = false;
        return;
    }

    if(name == conf.getStr("Main","ScoreboardName","money"))
    {
        let old = money.get(pl.xuid);
        if(old < num)
        {
            skip = true;
            money.add(pl.xuid, num-old);
            logger.debug(`Score ${displayName} change: ${pl.realName} add ${num-old}`);
        }
        else if(old > num)
        {
            skip = true;
            money.reduce(pl.xuid, old-num);
            logger.debug(`Score ${displayName} change: ${pl.realName} reduce ${old-num}`);
        }
        ChangeMessage(pl,num);
    }
});

function LLMoneyChange(xuid, newValue)
{
    let pl = mc.getPlayer(xuid);
    if(pl != null)
    {
        //在线
        skip = true;
        pl.setScore(conf.getStr("Main","ScoreboardName","money"), newValue);
        ChangeMessage(pl,newValue);
    }
    else
    {
        let changed = File.readFrom("plugins/EconomicSync/changed.json");
        if(changed == null || changed == "")
            changed = "[]";

        let arr = JSON.parse(changed);
        let index =  arr.length == 0 ? -1 : arr.indexOf(xuid);
        if(index == -1)
        {
            //离线修改
            arr.push(xuid);
            File.writeTo("plugins/EconomicSync/changed.json",JSON.stringify(arr));
        }
    }
}

mc.listen("onMoneyAdd",function(xuid_para,num_para)
{
    if(skip)
    {
        skip = false;
        return;
    }
    
    (function(xuid, num, current) {
        logger.debug("LLMoney change: " + data.xuid2name(xuid) + ` add ${num}`);
        LLMoneyChange(xuid, current);
    })(xuid_para, num_para, money.get(xuid_para));      // 注意！！此时get的money已经是修改过的了
});

mc.listen("onMoneyReduce",function(xuid_para,num_para)
{
    if(skip)
    {
        skip = false;
        return;
    }
    (function(xuid, num, current) {
        logger.debug("LLMoney change: " + data.xuid2name(xuid) + ` reduce ${num}`);
        LLMoneyChange(xuid, current);
    })(xuid_para, num_para, money.get(xuid_para));  // 注意！！此时get的money已经是修改过的了
});

mc.listen("onMoneyTrans",function(from_para,to_para,num_para)
{
    if(skip)
    {
        skip = false;
        return;
    }
    (function(from, to, currentFrom, currentTo, num) {
        logger.debug("LLMoney change: " + data.xuid2name(from) + ` trans ${num} -> ` + data.xuid2name(to));
        LLMoneyChange(from, currentFrom);
        LLMoneyChange(to, currentTo);
    })(from_para,to_para, money.get(from_para), money.get(to_para), num_para);  // 注意！！此时get的money已经是修改过的了
});

mc.listen("onMoneySet",function(xuid_para,num_para)
{
    if(skip)
    {
        skip = false;
        return;
    }
    (function(xuid, num) {
        logger.debug("LLMoney change: " + data.xuid2name(xuid) + ` set ${num}`);
        LLMoneyChange(xuid, num);
    })(xuid_para, num_para);
});

mc.listen("onJoin",function(pl){
    let changed = File.readFrom("plugins/EconomicSync/changed.json");

    let synced = false;
    if(changed != null && changed != "")
    {
        let arr = JSON.parse(changed);
        let index =  arr.length == 0 ? -1 : arr.indexOf(pl.xuid);
        if(index != -1)
        {
            //离线修改
            let num = money.get(pl.xuid);
            pl.setScore(conf.getStr("Main","ScoreboardName","money"), num);
            ChangeMessage(pl,num);

            arr.splice(index,1);
            File.writeTo("plugins/EconomicSync/changed.json",JSON.stringify(arr));
            synced = true;
        }
    }

    if(!synced)
        SyncMoney(pl);
});

mc.listen("onServerStarted",function(){
    CheckScoreboard();
});

mc.regConsoleCmd("economicsync reload", "reload economic's config", function(args){
    conf.reload();
});

ll.registerPlugin(
    /* name */ "EconomicSync",
    /* introduction */ "A plugin to sync money between llmoney and scoreboard",
    /* version */ _VER,
    /* otherInformation */ {}
); 

log(`[EconomicSync] EconomicSync经济同步插件已装载  当前版本：${_VER[0]}.${_VER[1]}.${_VER[2]}`);
log('[EconomicSync] 作者：yqs112358   首发平台：MineBBS');
log('[EconomicSync] 想要联系作者可前往MineBBS论坛');