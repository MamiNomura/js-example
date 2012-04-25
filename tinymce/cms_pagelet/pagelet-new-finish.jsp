<%--
 $Source: /home/cvs/cvsroot/cms/integration/web/system/components/convio/tiny_mce/plugins/cms_pagelet/pagelet-new-finish.jsp,v $
 $Author: mpih $
 $Revision: 1.2 $
 $Date: 2010/06/09 00:08:57 $
--%>

<%@ page contentType="text/javascript; charset=UTF-8"
         import="com.frontleaf.content.Folder,
                 com.frontleaf.content.template.ItemTemplate,
                 com.frontleaf.pagelet.Layout,
                 com.frontleaf.pagelet.LayoutType,
                 com.frontleaf.pagelet.Pagelet,
                 com.frontleaf.pagelet.PageletType,
                 com.frontleaf.pagelet.template.PageletTypeTemplate,
                 com.frontleaf.request.RequestTools,
                 com.frontleaf.security.User,
                 com.frontleaf.server.DispatcherTools,
                 com.frontleaf.sql.Query,
                 com.frontleaf.sql.RowDataSource,
                 com.frontleaf.sql.StatementCatalog,
                 com.frontleaf.util.Assert,
                 com.frontleaf.util.StringTools,
                 org.json.JSONObject,
                 java.util.logging.Level,
                 java.util.logging.Logger" %>

<%@ taglib uri="http://www.frontleaf.com/tlds/request-tags-1.0" prefix="rc" %>

<rc:request>
  <parameter name="folderID" type="folder"/>
  <parameter name="pageletTypeID" type="integer"/>
  <parameter name="pageletID" type="integer"/>
  <parameter name="itemID" type="integer" required="false"/>
  <parameter name="templateID" type="integer" required="false"/>
  <parameter name="float" type="string" required="false"/>
  <parameter name="width" type="string" required="false"/>
  <parameter name="widthUnits" type="string" required="false"/>
  <parameter name="marginRight" type="string" required="false"/>
  <parameter name="marginTop" type="string" required="false"/>
  <parameter name="marginLeft" type="string" required="false"/>
  <parameter name="marginBottom" type="string" required="false"/>
</rc:request>

<%! private static final Logger log = Logger.getLogger("com.frontleaf.pagelet"); %>

<%
  DispatcherTools.disableCache(response);

  User user = (User) request.getUserPrincipal();
  Folder folder = (Folder) requestData.getObject("folderID");

  // Permission check.
  if (user == null || user.isAnonymous()) {
    response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
    return;    
  } else if (! folder.getHost().isAdmin(user)) {
    response.sendError(HttpServletResponse.SC_FORBIDDEN);
    return;
  }

  PageletType pageletType = PageletType.find(requestData.getInteger("pageletTypeID"));

  Pagelet pagelet = new Pagelet(pageletType, folder.getHost());
  pagelet.setCreator(user);
  pagelet.setModifyingUser(user);

  Query query = StatementCatalog.getQuery("pagelet/Pagelet", "defaults");
  query.setID("hostID", folder.getHost());
  query.setID("pageletTypeID", pagelet.getType());
  RowDataSource defaults = query.getRowDataSource();
  if (defaults.hasData()) {
    // Set defaults for this pagelet
    pagelet.setTitle(defaults.getString("title"));
    pagelet.setDescription(defaults.getString("description"));
    pagelet.setStyleSheet(defaults.getInteger("styleSheetID"));
    pagelet.setQueryString(defaults.getString("queryString"));
  }
  Integer pageletID = requestData.getInteger("pageletID");
  pagelet.create(pageletID);
  
  //It's possible that the pagelet will have a default template, so deal with that here:
  Query templateQuery = StatementCatalog.getQuery("pagelet/Pagelet", "defaultTemplate");
  templateQuery.setID("hostID", folder.getHost());
  templateQuery.setID("pageletTypeID", pagelet.getType());
  RowDataSource defaultTemplateData = templateQuery.getRowDataSource();
  if (defaultTemplateData.hasData()) {
    //Set the default template:
    PageletTypeTemplate.setTemplate(pageletID, defaultTemplateData.getInteger("templateID"));
  }	
  
  Integer itemID = requestData.getInteger("itemID");
  if (itemID != null) { 

    query = StatementCatalog.getQuery("Item", "itemExists");
    query.setInteger("itemID", itemID);
    if (query.getBoolean()) {

      Layout layout = Layout.getInstance(itemID);
      if (layout == null) {
        layout = new Layout(LayoutType.getInstance("body"), itemID);
      }

      if (layout.getType().getKey().equals("body")) {
        layout.addPagelet(pagelet, 0, 0);
        layout.save();
      }
    }
  }

  Integer templateID = requestData.getInteger("templateID");
  if (templateID != null) { 

    query = StatementCatalog.getQuery("type/Template", "templateExists");
    query.setInteger("templateID", templateID);
    if (query.getBoolean()) {
      
      ItemTemplate template = new ItemTemplate(templateID);
      Layout layout = template.getLayout();
      layout.addPagelet(pagelet, 0, 0);
      template.save();
    }
  }

  request.setAttribute("page.pagelet", pagelet);
  DispatcherTools.setFolder(request, folder);
  DispatcherTools.setPreview(request);

  // Fetch pagelet markup.
  String url = folder.getPath() + pagelet.getURL();
  url = StringTools.appendQueryString(url, "context=editor");
  response.resetBuffer();

  JSONObject json = new JSONObject();
  json.put("id", pagelet.getID());
  JSONObject type = new JSONObject();
  type.put("key", pageletType.getKey());
  type.put("label", pageletType.getTitle());
  type.put("adminPath", pageletType.getAdminPath());
  type.put("adminDialogType", pageletType.getAdminDialogType());
  json.put("type", type);

  // Style data.
  json.put("float", requestData.getString("float"));
  json.put("width", requestData.getString("width"));
  json.put("widthUnits", requestData.getString("widthUnits"));
  json.put("marginTop", requestData.getString("marginTop"));
  json.put("marginLeft", requestData.getString("marginLeft"));
  json.put("marginRight", requestData.getString("marginRight"));
  json.put("marginBottom", requestData.getString("marginBottom"));

  String pageletSource = null;
  try {
    pageletSource = RequestTools.include(request, response, url);
    json.put("content", pageletSource);
  } catch (Exception e) {
    log.log(Level.WARNING, "Failed to load component.", e);
    json.put("error", Assert.getStackTrace(e));
  }

  response.resetBuffer();
  out.write(json.toString());
%>