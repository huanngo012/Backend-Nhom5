const convertStringToRegexp = (text) => {
  let regexp = "";
  const textNormalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[|\\{}()[\]^$+*?.]/g, "\\$&")
    .toLowerCase();

  regexp = textNormalized
    .replace(/a/g, "[a,á,à,ả,ã,ạ, â,ấ,ầ,ẩ,ẫ,ậ, ă,ắ,ằ,ẳ,ẵ,ặ]")
    .replace(/e/g, "[e,é,è,ẻ,ẽ,ẹ, ê,ế,ề,ể,ễ,ệ]")
    .replace(/i/g, "[í,ì,ỉ,ĩ,ị,i]")
    .replace(/y/g, "[y,ý,ỳ,ỷ,ỹ,ỵ]")
    .replace(/o/g, "[o,ó,ò,ỏ,õ,ọ, ô,ố,ồ,ổ,ỗ,ộ, ơ,ớ,ờ,ở,ỡ,ợ]")
    .replace(/u/g, "[u,ú,ù,ủ,ũ,ụ, ư,ứ,ừ,ử,ữ,ự]")
    .replace(/d/g, "[d,đ]");
  return new RegExp(regexp, "i");
};

module.exports = convertStringToRegexp;
