<%--
 $Source: /home/cvs/cvsroot/cms/integration/web/components/x-dialog/authoring/item-new.jsp,v $
 $Author: mpih $
 $Revision: 1.9 $
 $Date: 2012/02/13 19:32:06 $
--%>

<%@ page contentType="text/html; charset=UTF-8"
         import="com.frontleaf.content.ExtendedType,
                 com.frontleaf.content.Folder,
                 com.frontleaf.content.PublicNavigationFilter,
                 com.frontleaf.content.util.TinyMCEUtils,
                 com.frontleaf.form.Widget;
                 com.frontleaf.form.widgets.HTMLEditor;
                 com.frontleaf.record.ExtendedTypeForm,
                 com.frontleaf.request.MultiPartRequestData,
                 com.frontleaf.security.User,
                 com.frontleaf.server.DispatcherTools,
                 com.frontleaf.server.FileIconManager,
                 com.frontleaf.template.Template,
                 com.frontleaf.template.TemplateContext,
                 com.frontleaf.util.FileTools,
                 com.frontleaf.util.StringTools,
                 java.util.Iterator" %>

<%@ taglib uri="http://www.frontleaf.com/tlds/ui-tags-1.0" prefix="ui" %>
<%@ taglib uri="http://www.frontleaf.com/tlds/request-tags-1.0" prefix="rc" %>

<rc:request>
  <parameter name="typeID" type="integer"/>
  <parameter name="folderID" type="folder" required="false"/>
</rc:request>

<% 
  DispatcherTools.disableCache(response);

  // Permission check.
  final User user = (User) request.getUserPrincipal();
  if (user == null || user.isAnonymous()) {
    response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
    return;    
  }

  Integer typeID = requestData.getInteger("typeID");
  ExtendedType type = new ExtendedType(typeID);
  Folder folder = (Folder) requestData.getObject("folderID");
  if (folder == null) { 
    folder = type.getDefaultFolder();
  }

  if (folder == null) {
    out.print("This type has no default folder.  " +
	      "A folder must be specified to create a new item.");
    return;
  }

  // Permission check.
  if (! folder.checkPermission(user, "author")) {
    response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
    return;
  }

  request.setAttribute("page.type", type);
  request.setAttribute("page.folder", folder);

  ExtendedTypeForm form = ExtendedTypeForm.getDefault(type, folder);
  if (form == null) {
    out.print("A data entry form is not configured for this content type.");
    return;
  }

  // Override author entry form attributes so that they work with xdialog.
  form.setName("ItemChooserNewItemForm");
  form.setAttribute("id", "ItemChooserNewItemForm");
  form.setAttribute("target", null);
  form.setAttribute("onsubmit", null);
  form.setActionURL("/components/x-dialog/authoring/item-new-finish.jsp");

  // For RTF fields, skip the inline javascript init. The init will be done in item-form.js.
  for (Iterator<Widget> i = form.getWidgets(); i.hasNext();) {
    Widget w = i.next();
    if (w instanceof HTMLEditor) {
      ((HTMLEditor) w).skipJavascriptInit();
    }
  }

  Integer itemID = (Integer) form.getWidget("itemID").getDefaultValue();

  String property = "com.frontleaf.content.FileNameSeparator";
  String separator = folder.getHost().getConfiguration().getString(property, "-");

  String tinymceCSS = TinyMCEUtils.getContentCSS(folder.getHost());
%>

<ui:dialog>
<ui:title>New <%=type.getLabel()%></ui:title>

<ui:init>
  var user = {
    phone: '<%=StringTools.escapeQuotes(user.getPhone())%>',
    email: '<%=StringTools.escapeQuotes(user.getAddress())%>',
    firstName: '<%=StringTools.escapeQuotes(user.getFirstName())%>',
    lastName: '<%=StringTools.escapeQuotes(user.getLastName())%>'
  };

  YAHOO.convio.item.init({
    user: user,
    separator: '<%=StringTools.escapeQuotes(separator)%>',
    tinymceCSS: '<%=StringTools.escapeQuotes(tinymceCSS)%>',
    cmsFontControls: <%=TinyMCEUtils.areFontControlsEnabled(folder.getHost())%>,
    itemID: <%=itemID%>,
    typeID: <%=typeID%>,
    folderID: <%=folder.getID()%>,
    rootFolderID: <%=folder.getRoot().getID()%>
  });
</ui:init>

<ui:body>
<div>
  <div>
    Folder:
    <img src="<%=FileIconManager.getInstance().getFileIcon(folder)%>" align="absmiddle" />
    <%=folder.getNavigationTrail(new PublicNavigationFilter())%>
  </div>
  <%
    TemplateContext context = new TemplateContext(request, response, out); 
    Template template = form.getTemplate();
    template.write(context);
  %>
</div>
</ui:body>
</ui:dialog>
