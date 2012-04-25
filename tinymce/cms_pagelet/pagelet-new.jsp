<%--
  $Source: /home/cvs/cvsroot/cms/integration/web/system/components/convio/tiny_mce/plugins/cms_pagelet/pagelet-new.jsp,v $
  $Author: mami $
  $Revision: 1.5 $
  $Date: 2011/04/22 00:04:41 $
--%>

<%@ page contentType="text/html; charset=UTF-8"
         import="com.frontleaf.content.Folder,
                 com.frontleaf.security.SitewideAdmin,
                 com.frontleaf.security.User,
                 com.frontleaf.server.DispatcherTools,
                 com.frontleaf.server.MobileTools,
                 com.frontleaf.sql.IdFactory,
                 com.frontleaf.sql.Query,
                 com.frontleaf.sql.StatementCatalog,
                 com.frontleaf.sql.TableDataSource,
                 com.frontleaf.sql.ListDataSource,
                 com.frontleaf.util.StringTools,
                 java.util.logging.Logger" %>

<%@ taglib uri="http://www.frontleaf.com/tlds/ui-tags-1.0" prefix="ui" %>
<%@ taglib uri="http://www.frontleaf.com/tlds/request-tags-1.0" prefix="rc" %>

<rc:request> 
  <parameter name="folderID" type="folder"/>
  <parameter name="itemID" type="integer" required="false"/>
  <parameter name="templateID" type="integer" required="false"/>
  <parameter name="exclude" type="string" default=""/>
  <parameter name="isRTF" type="boolean" default="false"/>
</rc:request>

<%!
  private static final String CATALOG = "pagelet/PageletType";
  private static final Logger log = Logger.getLogger("com.frontleaf.pagelet");
%>

<%
  DispatcherTools.disableCache(response);

  User user = (User) request.getUserPrincipal();
  Integer itemID = requestData.getInteger("itemID");
  Integer templateID = requestData.getInteger("templateID");
  Folder folder = (Folder) requestData.getObject("folderID");

  // Permission check.
  if (user == null || user.isAnonymous()) {
    response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
    return;    
  } else if (! folder.getHost().isAdmin(user)) {
    response.sendError(HttpServletResponse.SC_FORBIDDEN);
    return;
  }

  boolean isSitewideAdmin = SitewideAdmin.isSitewideAdmin(user);
  String queryName = 
    isSitewideAdmin ? "editorComponentsByHost" : "editorComponentsByHostNonExpert";
  Query query = StatementCatalog.getQuery(CATALOG, queryName);
  query.setID("hostID", folder.getHost());
  TableDataSource pageletTypes = query.getTableDataSource();

  Integer pageletID = IdFactory.getInstance().newId();
 
  boolean isRTF = requestData.getBoolean("isRTF");
  String exclude = requestData.getString("exclude");
  //Pagelet types to exclude from the chooser.  
  if (isRTF) {
	  Query excludeQuery = StatementCatalog.getQuery(CATALOG, "getRTFexcludes");
	  ListDataSource excludes = excludeQuery.getListDataSource();
	  for (String key : excludes.toStringArray()) {
		exclude += "," + key ;
	  }
  }
  boolean allowMobile = MobileTools.isAllowed(folder.getHost());
  if (!allowMobile) {
    // add mobile switcher to exclude component
    exclude += ",mobile";
  }
  String[] excludeKeys = StringTools.split(exclude, ',');
%>

<ui:dialog>
<ui:title>Insert Component</ui:title>
<ui:body>

<form id="insertComponentForm" name="insertComponentForm" action="/system/components/convio/tiny_mce/plugins/cms_pagelet/pagelet-new-finish.jsp">

<input type="hidden" name="pageletID" value="<%=pageletID%>" />
<input type="hidden" name="folderID" value="<%=folder.getID()%>" />
<% if (itemID != null) { %><input type="hidden" name="itemID" value="<%=itemID%>" /><% } %>
<% if (templateID != null) { %><input type="hidden" name="templateID" value="<%=templateID%>" /><% } %>

<table id="bodyContainer" style="position:relative">
<tbody>
  <tr class="element">
    <th>Component type:</th>
    <td>
      <select name="pageletTypeID" id="pageletTypeID">
<%
  outer: while (pageletTypes.next()) { 
    for (int i = 0; i < excludeKeys.length; i++) {
      if (excludeKeys[i].equals(pageletTypes.getString("key"))) { 
        continue outer; 
      }
    }

    Integer pageletTypeID = pageletTypes.getInteger("pageletTypeID");
    String pageletTypeLabel = pageletTypes.getString("title");
%>
        <option value="<%=pageletTypeID%>"><%=pageletTypeLabel%></option>
<%
  }
%>
      </select>
    </td>
  </tr>
  <tr class="element">
    <th>Float:</th>
    <td>
      <input id="floatNone" type="radio" name="float" checked="checked" value="" />
      <label for="floatNone">None</label>
      &nbsp;
      <input id="floatLeft" type="radio" name="float" value="left" />
      <label for="floatLeft">Left</label>
      &nbsp;
      <input id="floatRight" type="radio" name="float" value="right" />
      <label for="floatRight">Right</label>
    </td>
  </tr>
  <tr class="element">
    <th>Width:</th>
    <td>
      <input name="width" class="number" value="" />
      <select name="widthUnits">
        <option value="%">Percent</option>
        <option value="px">Pixels</option>
      </select>
    </td>
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
