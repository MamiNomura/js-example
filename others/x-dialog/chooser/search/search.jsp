<%--
 $Source: /home/cvs/cvsroot/cms/integration/web/components/x-dialog/chooser/search/search.jsp,v $
 $Author: marick $
 $Revision: 1.14 $
 $Date: 2011/02/03 01:57:38 $
--%>

<%@ page contentType="text/html; charset=UTF-8"
         import="com.frontleaf.admin.AdminUtil,
                 com.frontleaf.content.ExtendedType,
                 com.frontleaf.content.Folder,
                 com.frontleaf.security.User,
                 com.frontleaf.server.FileIconManager,
                 com.frontleaf.server.Host,
                 com.frontleaf.sql.*,
                 com.frontleaf.util.StringTools,
                 java.util.List"%>

<%@ taglib uri="http://www.frontleaf.com/tlds/request-tags-1.0" prefix="rc" %>

<rc:request>
  <parameter name="folderID" type="folder"/>
  <parameter name="baseType" type="string" default=""/>
  <parameter name="keywords" type="string" default=""/>
  <parameter name="typeID" type="integer" required="false"/>
  <parameter name="context" type="string" values="dialog,explorer"/>
  <parameter name="selectionType" type="string" values="single,multiple" default="single" />
</rc:request>

<%!
   private static final String CATALOG = "type/ExtendedType";
%>

<%
  String baseType = requestData.getString("baseType");
  String context = requestData.getString("context");
  String selectionType = requestData.getString("selectionType");
  String keywords = requestData.getString("keywords");

  Folder searchFolder = (Folder) requestData.getObject("folderID");
  FileIconManager iconManager = FileIconManager.getInstance(application);

  ExtendedType type = null;
  Integer typeID = requestData.getInteger("typeID");
  if (typeID != null) {
    type = (ExtendedType) ExtendedType.find(typeID);
  }

  
  
  Query query = StatementCatalog.getQuery(CATALOG, "bySite");
  query.setID("rootID", searchFolder.getRoot());
  TableDataSource types = query.getTableDataSource();

  query = StatementCatalog.getQuery("content/MimeType", "defaults");
  TableDataSource mimeTypes = query.getTableDataSource();

  User user = (User) request.getUserPrincipal();
  
  int count = 0;
  Host host = searchFolder.getHost();
  List<Host> hosts = AdminUtil.getUserHosts(request, host.getHostGroup());
%>
<div id="toolbar">
    <div class="buttons">
       <a id="browse_button_st" class="image_text_button" href="javascript:void(0);" title="Browse">
         <span class="button_text">Browse</span>
       </a>
       <a id="search_button_st" class="image_text_button" href="javascript:void(0);" title="Search">
         <span class="button_text">Search</span>
       </a>
       <a id="recent_button_st" class="image_text_button" href="javascript:void(0);" title="Recent">
         <span class="button_text">Recent</span>
       </a>
     </div>
</div>
<div id="ItemChooserSearchTabTreeDiv">
<form name="search">
  <div id="criteria">
    <div id="keywords" class="label-field-wrap">
      <div class="label">
        <img id="keywords_image" class="toggle" src="/system/icons/16x16/navigate_close.gif" 
             align="absmiddle" alt="" /> 
        <a id="keywords_link" class="action" href="javascript:;">Keywords:</a>
      </div>
      <div id="keywords_inner_div" class="field-wrap">
        <textarea id="keywords_value" name="keywords_value"></textarea>
      </div>
    </div>
                        
    <div id="fields" class="label-field-wrap">
      <div class="label">
        <img id="fields_image" class="toggle" src="/system/icons/16x16/navigate_right.gif" align="absmiddle" alt="" /> 
        <a id="fields_link" class="action" href="javascript:;">Look for Keywords</a>:
      </div>
      <div id="fields_inner_div" class="field-wrap" style="display:none;">
        <select id="fields_value" name="fields_value" multiple="multiple" size="5">
          <option value="__any">(Anywhere in the item)</option>
          <option value="title">Title</option>
          <option value="description">Description</option>
          <option value="text">Body</option>
        </select>
      </div>
    </div>
                        
    <div class="label-field-wrap">
      <div class="label">
        <img id="modified_image" class="toggle" src="/system/icons/16x16/navigate_right.gif" align="absmiddle" alt="" /> 
        <a id="modified_link" class="action" href="javascript:;">Last Modified Between</a>:
      </div>
      <div id="modified_inner_div" class="field-wrap" style="display:none;">
        <span name="modifiedStartDate" id="modifiedStartDate"></span>
        <span>&nbsp;and</span>
        <span name="modifiedEndDate" id="modifiedEndDate"></span>
      </div>
    </div>
                        
    <div class="label-field-wrap">
      <div class="label">
        <img id="published_image" class="toggle" src="/system/icons/16x16/navigate_right.gif" align="absmiddle" alt="" /> 
        <a id="published_link" class="action" href="javascript:;">First Published Between</a>:
      </div>
      <div id="published_inner_div" class="field-wrap" style="display:none;">
        <span name="publishedStartDate" id="publishedStartDate"></span>
        <span>&nbsp;and</span>
        <span name="publishedEndDate" id="publishedEndDate"></span>
      </div>
    </div>
                        
    <% if (type == null && !hosts.isEmpty()) { %>
    <div id="host" class="label-field-wrap">
      <div class="label">
        <img id="hostID_image" class="toggle" src="/system/icons/16x16/navigate_right.gif" align="absmiddle" alt="" /> 
        <a id="hostID_link" class="action" href="javascript:;">Web Site</a>:
      </div>
      <div class="field-wrap" id="hostID_inner_div" style="display:none;">
        <select id="hostID_value" name="hostID_value" multiple size="5" onchange="YAHOO.convio.dialog.getArgs().searchTabClass.doHostChange(this.value)">
        <% for (Host child : hosts) {
          if (! child.isActive()) { continue; }
          String selected = child.equals(host) ? "selected" : ""; %>
          <option <%=selected%> value="<%=child.getID()%>"><%=child.getName()%></option>
        <% } %>
        </select>
      </div>
    </div>
    <% } else { %>
    <input type="hidden" name="hostID" value="<%=searchFolder.getHost().getID()%>" />
    <% } %>

    <div id="origin" class="label-field-wrap">
      <div class="label">
        <img id="origin_image" class="toggle" src="/system/icons/16x16/navigate_right.gif" align="absmiddle" alt="" /> 
        <a id="origin_link" class="action" href="javascript:;">Author</a>:
      </div>
      <div class="field-wrap" id="origin_inner_div" style="display:none;">
        <select id="origin_value" name="origin_value">
          <option value="">Anyone</option>
          <option value="admin">Any admin</option>
          <option value="public">Any website visitor</option>
        </select>
      </div>
    </div>

    <div id="contentType" class="label-field-wrap">
      <div class="label">
        <img class="toggle" id="typeID_image" src="/system/icons/16x16/navigate_right.gif" align="absmiddle" alt="" /> 
        <a id="typeID_link" class="action" href="javascript:;">Content Type</a>:</div>
      <div class="field-wrap" id="typeID_inner_div" style="display:none;">
        <% if (type == null) { %>
        <select name="typeID_value" id="typeID_value" multiple size="5">
          <option value="">Any</option>
          <% while (types.next()) { 
            if (StringTools.isEmpty(baseType) && !types.getString("baseLabel").equalsIgnoreCase("post") 
                || types.getString("baseLabel").equalsIgnoreCase(baseType)) { %>
          <option value="<%=types.getInteger("typeID")%>"><%=types.getString("label")%></option>
          <%   } 
             } %>
        </select>
        <% } else { %>
        <b><%=type.getLabel()%></b>
        <input id="typeID_value" type="hidden" name="typeID_value" value="<%=type.getID()%>" />
        <% } %>
      </div>
    </div>
                        
    <div id="mimeType" class="label-field-wrap">
      <div class="label"><img class="toggle" id="mimeType_image" src="/system/icons/16x16/navigate_right.gif" align="absmiddle" alt="" /> 
        <a id="mimeType_link" class="action" href="javascript:;">File Type</a>:</div>
      <div class="field-wrap" id="mimeType_inner_div" style="display:none;">
        <select name="mimeType_value" id="mimeType_value">
          <option value="">Any</option>
          <% while (mimeTypes.next()) { %>
          <option value="<%=mimeTypes.getString("name")%>"><%=mimeTypes.getString("label")%> (.<%=mimeTypes.getString("extension")%>)</option>
          <% } %>
        </select>
      </div>
    </div>
                        
    <div id="folders" class="label-field-wrap">
      <div class="label">
        <img class="toggle" id="folderID_image" src="/system/icons/16x16/navigate_right.gif" align="absmiddle" alt="" /> 
        <a id="folderID_link" class="action" href="javascript:;">Folder(s)</a>:
      </div>
      <div id="folderID_inner_div" class="field-wrap" style="display:none;">
        <div id="folderID_container"></div>
        <div>
          <img id="addFolderIcon" src="/system/icons/16x16/folder_add.gif" align="absmiddle" alt="" />
          <em><a id="addFolderLink" class="action">Add folder...</a></em>
        </div>
      </div>
    </div>

  </div>

  <input type="button" value="Search" id="searchSubmitButton" />
</form>
</div>

<div id="ItemChooserSearchTabListDiv">
  <div id="ItemChooserSearchTabResultsPaginationWrapper">
    <div id="ItemChooserSearchTabResultsPagination">&nbsp;</div>
  </div>
  <div id="ItemChooserSearchTabResultsDiv"></div>
</div>
