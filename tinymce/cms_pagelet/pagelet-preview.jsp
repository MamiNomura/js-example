<%--

  Renders a pagelet.
--%>

<%@ page contentType="text/javascript; charset=UTF-8"
         import="com.frontleaf.content.Folder,
                 com.frontleaf.content.template.DocumentContext,
                 com.frontleaf.content.template.PageView,
                 com.frontleaf.pagelet.Pagelet,
                 com.frontleaf.pagelet.PageletType,
                 com.frontleaf.request.RequestTools,
                 com.frontleaf.security.User,
                 com.frontleaf.server.DispatcherTools,
                 com.frontleaf.sql.ObjectNotFoundException,
                 com.frontleaf.util.Assert,
                 com.frontleaf.util.JSONTools,
                 com.frontleaf.util.StringTools,
                 org.json.JSONObject,
                 java.util.logging.Level,
                 java.util.logging.Logger" %>

<%@ taglib uri="http://www.frontleaf.com/tlds/request-tags-1.0" prefix="rc" %>

<rc:request>
  <parameter name="pageletTag" type="string"/>
  <parameter name="folderID" type="folder"/>
  <parameter name="itemID" type="integer" required="false"/>
</rc:request>

<%! private static final Logger log = Logger.getLogger("com.frontleaf.pagelet"); %>

<%
  DispatcherTools.disableCache(response);

  User user = (User) request.getUserPrincipal();
  Folder folder = (Folder) requestData.getObject("folderID");

  // Permission check.
  if (user == null || ! folder.getHost().isAdmin(user)) {
    throw new RuntimeException("Failed to load component. Insufficient privileges");
  }

  String pageletTag = requestData.getString("pageletTag");
  Pagelet pagelet = Pagelet.findByTag(folder.getHost(), pageletTag);
  PageletType pageletType = null;
  if (pagelet == null) {
    try {
      pageletType = PageletType.find(pageletTag);
    } catch (ObjectNotFoundException e) {
      throw new RuntimeException("Failed to load component. Invalid ID: " + pageletTag);
    }

    if (pageletType == null) {
      throw new RuntimeException("Failed to load component. Unable to resolve component: " + pageletTag);
    }

    pagelet = pageletType.getDefault(folder.getHost());
    if (pagelet == null) {
      throw new RuntimeException("Failed to load component. The '" + pageletType.getTitle() + "' component is not enabled.");
    }
  } else {
    pageletType = pagelet.getType();
  }

  // Fetch pagelet markup.
  request.setAttribute("page.pagelet", pagelet);
  DispatcherTools.setFolder(request, folder);
  DispatcherTools.setPreview(request);

  // If there is a master item, then set it as the page.view. 
  // Some pagelets depend on this master item being set.
  Integer itemID = requestData.getInteger("itemID");
  if (itemID != null) {
    PageView view = PageView.getInstance(itemID, request);
    request.setAttribute("page.view", view);

    DocumentContext templateContext = new DocumentContext(view, request, response, out); 
    request.setAttribute("page.context", templateContext);
  }

  response.resetBuffer();
  String url = StringTools.appendQueryString(folder.getPath() + pagelet.getURL(), "context=editor");

  JSONObject json = new JSONObject();
  json.put("id", pagelet.getID());
  JSONObject type = new JSONObject();
  type.put("key", pageletType.getKey());
  type.put("label", pageletType.getTitle());
  type.put("adminPath", pageletType.getAdminPath());
  type.put("adminDialogType", pageletType.getAdminDialogType());
  json.put("type", type);

  String pageletSource = null;
  try {
    pageletSource = RequestTools.include(request, response, url);
    json.put("content", pageletSource);
  } catch (Exception e) {
    log.log(Level.WARNING, "Failed to load component.", e);
    json.put("error", Assert.getStackTrace(e));
  }

  JSONTools.write(response, json);
%>