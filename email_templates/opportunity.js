function opportunity(source, feed, page4Link){

    let str = "";

    feed.forEach(x => {
        str += "<tr>"
        str += `<td style='width:100% !important; padding:0; font-size:14px;'>${x.shop} - <span style='font-weight:bold'>${x.price} $</span> </td>`
        str += "</tr>"
    });

    let arr = page4Link.split("prds=");

    arr[0] += "prds=scoring:tp,";

    page4Link = arr.join("");
    
    console.log('best source is')
    console.log(source)
    return(
        `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
<meta name="format-detection" content="telephone=no"> 
<meta name="viewport" content="width=device-width; initial-scale=1.0; maximum-scale=1.0; user-scalable=no;">
<meta http-equiv="X-UA-Compatible" content="IE=9; IE=8; IE=7; IE=EDGE" />

    <title>Page title</title>

    <style type="text/css">
        @import url(http://fonts.googleapis.com/css?family=Roboto:300); /*Calling our web font*/ 
        #outlook a { padding:0; }
        body{ width:100% !important; -webkit-text; size-adjust:100%; -ms-text-size-adjust:100%; margin:0; padding:0; }     
        .ReadMsgBody { width: 100%; }
        .ExternalClass {width:100%;} 
        .backgroundTable {margin:0 auto; padding:0; width:100%;!important;} 
        table td {border-collapse: collapse;}
        .ExternalClass * {line-height: 115%;}
        [class="mobile-column"] {display: block;} 
        *[class="mob-column"] {float: none !important;width: 100% !important;} 
        *[class="hide"] {display:none !important;} 
        *[class="100p"] {width:100% !important; height:auto !important; padding:0 !important}
        *[class="condensed"] {padding-bottom:40px !important; display: block;}
        *[class="center"] {text-align:center !important; width:100% !important; height:auto !important;} 
        *[class="100pad"] {width:100% !important; padding:20px;} 
        *[class="100padleftright"] {width:100% !important; padding:0 20px 0 20px;} 
        *[class="100padtopbottom"] {width:100% !important; padding:20px 0px 20px 0px;}
        @media screen and (max-width: 630px) {

        }
    </style>


</head>

<body style="padding:0; margin:0">

<table border="0" cellpadding="0" cellspacing="0" style="margin: 0; padding: 0" width="100%">
    <tr>
        <td align="center" valign="top">
            <table width="640" border="0" cellspacing="0" cellpadding="20" class="100p">
                <tr>
                    <td style="font-weight:bold;font-size:20px; padding-bottom:2px;" align="center">New opportunity found - ${source.text}</td>
                </tr>
                <tr>
                    <td style="width:100%; border-bottom:1px solid lightgray; height:2px; padding:2px;"></td>
                </tr>
                <tr>
                    <td style="width:100% !important; padding:0; font-size:15px; color: red; font-weight:bold; padding-bottom:3px !important;">Source chosen by the algorithm</td>
                </tr>
                <tr>
                    <td style="width:100% !important; padding:0; font-size:14px">Link - <a href="${source.link || source.url}" target="_blank">Click to open on  ${source.source}</a></td>
                </tr>
                <tr>
                    <td style="width:100% !important; padding:0; font-size:14px">Price - <span style="font-weight:bold">${source.price} $</span></td>
                </tr>
                <tr>
                    <td style="width:100% !important; padding:0; font-size:14px">After taxes - <span style="font-weight:bold">${source.computed.taxed} $</span></td>
                </tr>
                <tr>
                    <td style="width:100% !important; padding:0; font-size:14px">After CC fees - <span style="font-weight:bold">${source.computed.afterCreditCardFees} $</span></td>
                </tr>
                <tr>
                    <td style="width:100% !important; padding:0; font-size:14px">Margin- <span style="font-weight:bold">${source.computed.margin} $</span></td>
                </tr>
                <tr>
                    <td style="width:100% !important; padding:0; font-size:14px">Possible net profit (minimum) - <span style="font-weight:bold">${source.computed.net} $</span></td>
                </tr>
                <tr>
                    <td style="width:100%; border-bottom:1px solid lightgray; height:2px; padding:2px;"></td>
                </tr>
                <tr>
                    <td style="width:100% !important; padding:0; font-size:15px; color: red; font-weight:bold; padding-bottom:3px !important;">Page 4</td>
                </tr>
                <tr>
                    <td style="width:100% !important; padding:0; font-size:14px">Link - <a href="${page4Link} target="_blank">Click to see page 4</a></td>
                </tr>
                ${str}
            </table>
        </td>
    </tr>
</table>

</body>
</html>
`
    )
}

module.exports = opportunity;