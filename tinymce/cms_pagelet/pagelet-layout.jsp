<%--
 $Source: /home/cvs/cvsroot/cms/integration/web/system/components/convio/tiny_mce/plugins/cms_pagelet/pagelet-layout.jsp,v $
 $Author: mami $
 $Revision: 1.2 $
 $Date: 2009/12/02 18:49:31 $
--%>

<%@ page contentType="text/html; charset=UTF-8"
         import="com.frontleaf.pagelet.Pagelet,
                 com.frontleaf.security.User,
                 com.frontleaf.server.DispatcherTools,
                 java.util.logging.Logger" %>

<%@ taglib uri="http://www.frontleaf.com/tlds/ui-tags-1.0" prefix="ui" %>
<%@ taglib uri="http://www.frontleaf.com/tlds/request-tags-1.0" prefix="rc" %>


<rc:request>
  <parameter name="pageletID" type="integer" required="false"/>
  <parameter name="pageletTag" type="string" required="false"/>
</rc:request>

<%
  DispatcherTools.disableCache(response);  
  Integer pageletID = requestData.getInteger("pageletID");
  String pageletTag = requestData.getString("pageletTag");
  Pagelet pagelet;    
  if (pageletID != null) {
	  pagelet = new Pagelet(pageletID);
  } else {
	  // get default pagelet	  
	  pagelet = Pagelet.findByTag(DispatcherTools.getFolder(request).getHost(), pageletTag);
  }
  // Permission check.
  User user = (User) request.getUserPrincipal();
  if (user == null || user.isAnonymous()) {
    response.sendError(HttpServletResponse.SC_UNAUTHORIZED);    
    return;
  } else if (! pagelet.getHost().isAdmin(user)) {
    response.sendError(HttpServletResponse.SC_FORBIDDEN);    
    return;
  }
%>

<ui:dialog>
<ui:title>Component Style and Layout</ui:title>
<ui:body>

<form name="pageletLayoutForm">
<table id="bodyContainer">
<tbody>
  <tr class="element">
    <th>Float:</th>
    <td>
      <input id="floatNone" type="radio" name="float" checked="checked" value="" />
      <label for="floatNone">None</label>
      
      <input id="floatLeft" type="radio" name="float" value="left" />
      <label for="floatLeft">Left</label>

      <input id="floatRight" type="radio" name="float" value="right" />
      <label for="floatRight">Right</label>
    <td>
  </tr>
  <tr class="element">
    <th>Width:</th>
    <td>
      <input name="width" class="number" value="" />
      <select name="widthUnits">
        <option value="%">Percent</option>
        <option value="px">Pixels</option>
      </select>
    <td>
  </tr>
  <tr class="element">
    <th>Margins:</th>
    <td style="padding-top:16px;padding-bottom:0px"><hr /></td>
  </tr>
  <tr>
    <td>&nbsp;</td>
    <td>

      <table class="pageletMargins">
        <tr>
          <td width="33%">&nbsp;</td>
          <td width="33%" align="right">
            Top: <input name="marginTop" value="" /> px
          </td>
          <td width="33%">&nbsp;</td>
        </tr>
        <tr>
          <td width="33%">
            Left: <input name="marginLeft" value="" /> px
          </td>
          <td width="33%">&nbsp;</td>
          <td width="33%" align="right">
            Right: <input name="marginRight" value="" /> px
          </td>
        </tr>
        <tr>
          <td width="33%">&nbsp;</td>
          <td width="33%" align="right">
            Bottom: <input name="marginBottom" value="" /> px
          </td>
          <td width="33%">&nbsp;</td>
        </tr>
      </table>

    </td>
  </tr>
</tbody>
</table>
</form>

</ui:body>
</ui:dialog>
