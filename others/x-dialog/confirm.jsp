<%@ page contentType="text/html; charset=UTF-8" %>
<%@ taglib uri="http://www.frontleaf.com/tlds/ui-tags-1.0" prefix="ui" %>

<ui:dialog>
<ui:title><div id="myTitle">Confirmation Required</div></ui:title>
<ui:init>
  var dialogArguments = YAHOO.convio.dialog.getArgs();
  var gTitle = dialogArguments.title;
  if (gTitle) {  
  	YAHOO.util.Dom.get("myTitle").innerHTML = gTitle;
  }

  if (dialogArguments.statusText) {
    YAHOO.util.Dom.get("statusText").innerHTML = dialogArguments.statusText;
  } else {
    YAHOO.util.Dom.setStyle("statusText", "display", "none");
  }

  YAHOO.util.Dom.get("warnings").innerHTML = dialogArguments.warnings;   
  YAHOO.util.Dom.get("endText").innerHTML = dialogArguments.endText;   


  YAHOO.convio.dialog.redraw();
  YAHOO.convio.dialog.center();
</ui:init>
<ui:body>

<div class="confirmationHeader" id="statusText"></div>
<div id="warnings"></div>
<div id="endText"></div>

</ui:body>
</ui:dialog>