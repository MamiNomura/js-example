<%--
 $Source: /home/cvs/cvsroot/cms/integration/web/components/x-dialog/authoring/item-new-finish.jsp,v $
 $Author: marick $
 $Revision: 1.3 $
 $Date: 2011/02/24 02:40:41 $
--%>

<%@ page contentType="text/javascript; charset=UTF-8"
         import="com.frontleaf.content.Document,
                 com.frontleaf.content.Folder,
                 com.frontleaf.content.Storage,
                 com.frontleaf.content.rpc.CreateDocumentAction,
                 com.frontleaf.content.rpc.DocumentAction,
                 com.frontleaf.content.rpc.ResultCodes,
                 com.frontleaf.content.util.RecentTracker,
                 com.frontleaf.image.ImageScaler,
                 com.frontleaf.locale.ResourceTools,
                 com.frontleaf.locale.XMLResourceBundle,
                 com.frontleaf.parser.TextHandler,
                 com.frontleaf.request.MultiPartRequestTracker,
                 com.frontleaf.request.RequestData,
                 com.frontleaf.server.FileIconManager,
                 com.frontleaf.sql.SessionManager,
                 com.frontleaf.util.FileTools,
                 com.frontleaf.util.JSONTools,
                 java.util.HashMap,
                 java.util.Iterator,
                 java.util.Map,
                 java.util.logging.Logger,
                 org.json.JSONObject" %>

<%!
  private static final Logger log = Logger.getLogger("com.frontleaf.content");

  private static final String VERSION_SIZE_LIMIT_PROPERTY = 
    "com.frontleaf.content.VersionSizeLimit";

  private static final long DEFAULT_VERSION_SIZE_LIMIT = 1024 * 1024 * 5;

  private static final Map messages = new HashMap();
  static {
    messages.put(ResultCodes.NOT_AUTHENTICATED, "create.session.expired");
    messages.put(ResultCodes.PERMISSION_DENIED, "create.permission.denied");
    messages.put(ResultCodes.SIZE_EXCEEDED, "create.size.exceeded");
    messages.put(ResultCodes.QUOTA_EXCEEDED, "create.quota.exceeded");
    messages.put(ResultCodes.INVALID_DATA, "edit.invalid.data");
    messages.put(ResultCodes.INVALID_FILE, "edit.invalid.file");
    messages.put(ResultCodes.VERSIONING_DISABLED, "edit.version.size.limit.exceeded");
    messages.put(ResultCodes.NO_FILE_TO_PUBLISH, "publish.no.file");
    messages.put(ResultCodes.ALREADY_PUBLISHED, "publish.already.published");
    messages.put(ResultCodes.PUBLICATION_EXCEEDED_QUOTA, "publish.quota.exceeded");
    messages.put(ResultCodes.PUBLICATION_PERMISSION_DENIED, "publish.permission.denied");
    messages.put(ResultCodes.DEPENDENCIES_NOT_AUTHENTICATED, "publish.permission.dependent.denied");
  }
%>

<% 
  DocumentAction action = new CreateDocumentAction(request, response);

  try {
    action.process();
    SessionManager.close();
  } finally {
    MultiPartRequestTracker tracker = MultiPartRequestTracker.getInstance(session);
    if (tracker != null) { 
      tracker.finish();
    }
  }

  String resultCode = action.getResultCode();
  boolean isSuccess = action.isSuccessful();

  JSONObject json = new JSONObject();
  json.put("status", isSuccess ? "ok" : "error");
  json.put("resultCode", resultCode);

  if (isSuccess) {
    // The action succeeded!

    Document document = action.getDocument();
    Folder folder = document.getFolder();

    RecentTracker tracker = RecentTracker.getInstance(request);
    tracker.addDocument(document);

    FileIconManager iconManager = FileIconManager.getInstance(application);
    String systemName = document.getName();
    String thumbnail = 
      (systemName == null || ! document.getType().equals("image")) ? 
        iconManager.getFileIcon(systemName, iconManager.LARGE) :
        folder.getHost().getPreviewURL() + document.getFolder().getPath() +  
        ImageScaler.getName(systemName, 80); 

    json.put("itemID", document.getID());
    json.put("title", document.getTitle());
    json.put("url", document.getURL());
    json.put("icon", iconManager.getFileIcon(document.getName()));
    json.put("thumbnail", thumbnail);

  } else if (messages.containsKey(resultCode)) { 
    // An error occurred while trying to create the new item.

    String resultDetail = (String) messages.get(resultCode);
    XMLResourceBundle resources = ResourceTools.getResources(session, "item");
    String message = null;

    // Handle submission data errors.
    if (ResultCodes.INVALID_DATA.equals(resultCode)) {

      message = resources.getString(resultDetail + ".message", "");
      if (action.getFormEvent() != null) {
        RequestData formData = action.getFormEvent().getData();
        if (formData != null) {
          // Fetch errors from the formdata.
          message = "<ul>\n";

          Iterator<String> i = formData.getErrorMessages(RequestData.ALL_ERRORS);
          while (i.hasNext()) {
             String errorMessage = i.next();
             message += "<li>" + errorMessage + "</li>\n";
          }

          message += "</ul>\n";
        }
      }

    } else if (ResultCodes.INVALID_FILE.equals(resultCode)) {
      message = resources.getString(resultDetail + ".message", action.getFileName());
    } else if (ResultCodes.QUOTA_EXCEEDED.equals(resultCode) ||
	       ResultCodes.PUBLICATION_EXCEEDED_QUOTA.equals(resultCode)) {
      //NOTE: this used to show up if a save or publish would have gone 
      //over quota, but that doesn't happen anymore
      String[] params = new String[2];
      params[0] = "n.a.";
      params[1] = "n.a.";

      Document document = action.getDocument();
      if (document != null) {
        Storage storage = Storage.getInstance(document.getSubsite());
        if (storage != null) { 
	  params[0] = FileTools.formatSize(storage.getDatabaseUsed());
          params[1] = FileTools.formatSize(storage.getDatabaseQuota());
        }
      }

      message = resources.getString(resultDetail + ".message", params);

    } else if (ResultCodes.VERSIONING_DISABLED.equals(resultCode)) {

      String param = "n.a.";

      Document document = action.getDocument();
      if (document != null) {
        Long versionSizeLimit = document.getHost().getConfiguration().getLong(
          VERSION_SIZE_LIMIT_PROPERTY, DEFAULT_VERSION_SIZE_LIMIT);
        param = FileTools.formatSize(versionSizeLimit.longValue());
      }

      message = resources.getString(resultDetail + ".message", param);

    } else {
      message = resources.getString(resultDetail + ".message");
    }

    json.put("resultDetailHeading", resources.getString(resultDetail + ".heading"));
    // TODO: toText is a workaround for YUI 2.70 YAHOO.util.JSON.parse bug.
    json.put("resultDetailMessage", TextHandler.toText(message));
  }

  JSONTools.write(response, json, true);
%>