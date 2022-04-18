const express = require("express");
const Http = require("http");
const router = express.Router();
const Articles = require("../schemas/Articles")
const moment = require("moment");
const authMiddleware = require("../middleware/authMiddleware");
const Users = require("../schemas/Users");


router.use(express.json()); 
router.use(express.urlencoded( {extended : false } ));


router.get("/", (req, res) =>{
  res.send("/article 경로에 해당합니다")
})

//게시글 저장
router.post("/add", authMiddleware, async ( req, res) => {
  try{
  const { articleTitle, articleContent, articleImageUrl, articlePrice } = req.body;
  const { userId, userNickname, userGu, userDong } = res.locals.userDB; 
  const article =  Articles.find()
  const articleNumber = await article.countDocuments() + 1
  const articleCreatedAt = moment().format("YYYY-MM-DD HH:mm:ss")
  const existsUsers = await Users.findOne({userId})
  const userImage = existsUsers.userImage
  const createArticles = await Articles.create({articleTitle, articleContent ,articleImageUrl, articlePrice, userId, userNickname, userGu, userDong, articleNumber, articleCreatedAt, userImage});
  res.status(200).json({createArticles})
  }
  catch(err){
    
      res.status(400).json({response: "fail",
      msg: "양식에 맞추어 모든 내용을 작성해주세요"  })
      }
  });
  
  // (입력 값) articleTitle  articleContent  articleImageUrl articlePrice
  //(헤더 토큰 값) userId  userNickname  userGu  userDong
  //(server 지정 값) articleNumber  articleCreatedAt 
  //(DB 빼올 값) userImage

//게시글 삭제
router.delete("/delete/:articleNumber", authMiddleware, async (req, res) => {  
  const articleNumber = req.params.articleNumber;
  const { userId } = res.locals.userDB;
  const existsArticles = await Articles.findOne({ articleNumber });
  const DBuserId = existsArticles.userId;
  if (userId == DBuserId) {
    await Articles.deleteOne({ articleNumber });
    res.json({ response : "success" });
    return;
  }
  else{res.json({ response : "유효하지 않은 토큰정보 입니다." });
  }
});

//게시글 수정
router.post("/edit/:articleNumber", authMiddleware, async (req, res) => {  
  const { userId } = res.locals.userDB; 
  const articleNumber = req.params.articleNumber;
  const { articleTitle, articleContent, articleImageUrl, articlePrice  } = req.body;
  const existsArticles = await Articles.findOne({ articleNumber });
  const DBuserId = existsArticles.userId;
  if (userId == DBuserId) {
    await Articles.updateOne({ articleNumber },{ $set: req.body})
    res.json({ response: "success", msg: "게시글 수정이 완료되었습니다" });
    return;
  }
  // else{ res.json({ response: "fail", msg: "양식에 맞추어 모든 내용을 작성해주세요" });
  // } // 한 부분 빠지더라도 바디에서 받아온 내역만 수정하여 오류 나지 않음
});

router.get("/edit/:articleNumber", authMiddleware, async  (req, res) => {  
    const { userId } = res.locals.userDB; 
    const articleNumber = req.params.articleNumber;
    const existsArticles = await Articles.findOne({ articleNumber });
    const existsUsers = await Users.findOne({userId})
    const userImage = existsUsers.userImage
    res.json({ existsArticles, userImage});
  });


module.exports = router;