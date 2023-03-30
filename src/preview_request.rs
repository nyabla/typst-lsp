use std::collections::HashMap;

use lsp_types::request::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Eq, PartialEq, Clone, Deserialize, Serialize)]
pub struct ShowPreviewParams {
    pub pdf: String,
}

#[derive(Debug, Eq, PartialEq, Clone, Deserialize, Serialize)]
pub struct ShowPreviewResponse {}

#[derive(Debug)]
pub enum ShowPreview {}

impl Request for ShowPreview {
    type Params = ShowPreviewParams;
    type Result = ShowPreviewResponse;
    const METHOD: &'static str = "custom/showPreview";
}
